// ============================================================
// Tenant Middleware — Multi-tenant workspace resolution
// ============================================================
// Extracts workspaceId from X-Workspace-Id header or ?workspaceId query.
// Verifies user has access to the workspace.
// Sets request.workspaceId for downstream guards/controllers.
// ============================================================

import { Injectable, NestMiddleware, ForbiddenException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const user = (req as any).user;

    // No user → skip (AuthGuard will reject if needed)
    if (!user) return next();

    // Dev bypass
    if (user.sub === 'dev-user') {
      const defaultWs = await this.prisma.workspace.findFirst({
        orderBy: { createdAt: 'asc' },
      });
      (req as any).workspaceId = defaultWs?.id ?? 'default';
      return next();
    }

    // 1️⃣ Extract workspaceId
    const workspaceId =
      (req.headers['x-workspace-id'] as string) ||
      (req.query['workspaceId'] as string);

    if (!workspaceId) {
      // Try to default to first workspace user belongs to
      const membership = await this.prisma.workspaceUser.findFirst({
        where: { userId: user.sub },
        orderBy: { createdAt: 'asc' },
        select: { workspaceId: true },
      });

      if (membership) {
        (req as any).workspaceId = membership.workspaceId;
        return next();
      }

      // No workspace at all — let controller decide
      (req as any).workspaceId = null;
      return next();
    }

    // 2️⃣ Verify access
    const membership = await this.prisma.workspaceUser.findUnique({
      where: {
        userId_workspaceId: { workspaceId, userId: user.sub },
      },
    });

    if (!membership) {
      throw new ForbiddenException('No access to this workspace');
    }

    (req as any).workspaceId = workspaceId;
    next();
  }
}

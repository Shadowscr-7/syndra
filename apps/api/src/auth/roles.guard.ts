// ============================================================
// RBAC Guard — Role-based access control per workspace
// ============================================================
// Used with @Roles('OWNER', 'EDITOR') decorator.
// Requires AuthGuard to run first (sets request.user).
// Requires TenantMiddleware to run first (sets request.workspaceId).
// ============================================================

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from './decorators';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // No @Roles() → allow
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const userId: string | undefined = request.user?.sub;
    const workspaceId: string | undefined = request.workspaceId;

    if (!userId || !workspaceId) {
      throw new ForbiddenException('Missing user or workspace context');
    }

    // Dev mode bypass
    if (userId === 'dev-user') return true;

    const membership = await this.prisma.workspaceUser.findUnique({
      where: { userId_workspaceId: { workspaceId, userId } },
    });

    if (!membership) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    if (!requiredRoles.includes(membership.role)) {
      throw new ForbiddenException(
        `Role ${membership.role} is not authorized. Required: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}

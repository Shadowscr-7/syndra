// ============================================================
// RBAC Guard — Role-based access control
// ============================================================
// Supports two layers:
//   @Roles('ADMIN', 'COLLABORATOR') → checks User.role (platform-level)
//   @Roles('OWNER', 'EDITOR')       → checks WorkspaceUser.role (workspace-level)
// Requires AuthGuard to run first (sets request.user).
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

// Platform-level roles (from UserRole enum)
const PLATFORM_ROLES = ['ADMIN', 'COLLABORATOR', 'USER'];
// Workspace-level roles (from WorkspaceRole enum)
const WORKSPACE_ROLES = ['OWNER', 'EDITOR', 'VIEWER'];

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
    const userRole: string | undefined = request.user?.role;

    if (!userId) {
      throw new ForbiddenException('Missing user context');
    }

    // Dev mode bypass
    if (userId === 'dev-user') return true;

    // ── Check platform-level roles ──
    const requiredPlatformRoles = requiredRoles.filter((r) => PLATFORM_ROLES.includes(r));
    if (requiredPlatformRoles.length > 0) {
      if (userRole && requiredPlatformRoles.includes(userRole)) {
        return true;
      }
      // ADMIN always passes any platform role check
      if (userRole === 'ADMIN') return true;
    }

    // ── Check workspace-level roles ──
    const requiredWorkspaceRoles = requiredRoles.filter((r) => WORKSPACE_ROLES.includes(r));
    if (requiredWorkspaceRoles.length > 0) {
      const workspaceId: string | undefined = request.workspaceId;
      if (!workspaceId) {
        throw new ForbiddenException('Missing workspace context');
      }

      // ADMIN user always passes workspace checks
      if (userRole === 'ADMIN') return true;

      const membership = await this.prisma.workspaceUser.findUnique({
        where: { userId_workspaceId: { workspaceId, userId } },
      });

      if (!membership) {
        throw new ForbiddenException('No eres miembro de este workspace');
      }

      if (requiredWorkspaceRoles.includes(membership.role)) {
        return true;
      }
    }

    // If only platform roles were required and we didn't match
    if (requiredPlatformRoles.length > 0 && requiredWorkspaceRoles.length === 0) {
      throw new ForbiddenException(
        `Rol "${userRole}" no autorizado. Requerido: ${requiredPlatformRoles.join(', ')}`,
      );
    }

    throw new ForbiddenException(
      `Permisos insuficientes. Roles requeridos: ${requiredRoles.join(', ')}`,
    );
  }
}

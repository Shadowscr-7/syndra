// ============================================================
// Auth Decorators — @Public(), @CurrentUser(), @Roles()
// ============================================================

import { SetMetadata, createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IS_PUBLIC_KEY, type JwtPayload } from './auth.guard';

/** Mark endpoint as public (no auth required) */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Extract current user from request (set by AuthGuard) */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

/** Workspace context extracted by TenantMiddleware */
export const CurrentWorkspace = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.workspaceId ?? 'default';
  },
);

// ── RBAC ─────────────────────────────────────────────────

export const ROLES_KEY = 'roles';

/** Require specific roles for this endpoint */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

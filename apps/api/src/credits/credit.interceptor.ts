// ============================================================
// Credit Interceptor — Deducts credits AFTER successful generation
// ============================================================

import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { CreditService } from './credits.service';

@Injectable()
export class CreditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(CreditInterceptor.name);

  constructor(private readonly creditService: CreditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const operation: string | undefined = request._creditOperation;
    const workspaceId: string | undefined =
      request.headers?.['x-workspace-id'] ??
      request.user?.workspaceId ??
      request.workspaceId;

    if (!operation || !workspaceId) {
      return next.handle();
    }

    // Si usa credenciales propias, no deducir créditos
    if (request._usesOwnCredentials) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async (result) => {
        try {
          const referenceId =
            result?.id ?? result?.jobId ?? result?.assetId ?? undefined;
          await this.creditService.consumeCredits(
            workspaceId,
            operation,
            `${operation}: ${result?.prompt?.slice(0, 80) ?? 'generation'}`,
            referenceId,
          );
        } catch (err: any) {
          this.logger.error(
            `Failed to deduct credits for ${operation}: ${err.message}`,
          );
        }
      }),
    );
  }
}

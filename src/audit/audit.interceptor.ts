import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request } from 'express';
import { AuditLogsService } from './audit-logs.service';
import { AuthenticatedUser } from '../common/types/authenticated-user.interface';

const MUTATING_METHODS = new Set(['POST', 'PATCH', 'PUT', 'DELETE']);
// Auth routes aren't tied to a clinic-scoped resource and may carry sensitive bodies — never audited.
const SKIP_PREFIXES = ['/api/auth'];

const ACTION_VERBS: Record<string, string> = {
  POST: 'Created',
  PATCH: 'Updated',
  PUT: 'Updated',
  DELETE: 'Deleted',
};

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private auditLogsService: AuditLogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const method = request.method;

    if (!MUTATING_METHODS.has(method) || SKIP_PREFIXES.some((p) => request.path.startsWith(p))) {
      return next.handle();
    }

    return next.handle().pipe(
      tap({
        next: (body) => {
          const user = (request as unknown as { user?: AuthenticatedUser }).user;
          if (!user?.clinicId) return;

          const segments = request.path.split('/').filter(Boolean); // ['api', 'patients', ':id', ...]
          const resource = segments[1] ?? 'unknown';
          const resourceId =
            (body as { _id?: string; id?: string })?._id ??
            (body as { _id?: string; id?: string })?.id ??
            segments[2];

          this.auditLogsService
            .record({
              clinicId: user.clinicId,
              userId: user.userId,
              userName: user.email,
              role: user.role,
              method,
              path: request.path,
              resource,
              resourceId: typeof resourceId === 'string' ? resourceId : undefined,
              description: `${ACTION_VERBS[method] ?? method} ${resource}`,
              statusCode: context.switchToHttp().getResponse().statusCode,
              ipAddress: request.ip,
            })
            .catch(() => undefined);
        },
      }),
    );
  }
}

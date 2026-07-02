import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const { method, url, user } = req as { method: string; url: string; user?: { id: string } };
    const userId = user?.id ?? 'anon';
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        this.logger.log(`${method} ${url} ${Date.now() - start}ms user=${userId}`);
      }),
      catchError((err: unknown) => {
        const status = (err as { status?: number })?.status ?? 500;
        this.logger.warn(`${method} ${url} ${status} ${Date.now() - start}ms user=${userId}`);
        throw err;
      }),
    );
  }
}

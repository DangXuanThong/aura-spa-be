import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RESPONSE_MESSAGE_METADATA } from '../constants/response-message.constant';
import { getHttpStatusMessage } from '../helpers/http-status.helper';
import { ApiDataWithMeta, ApiSuccessResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<unknown>> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessResponse<unknown>> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    return next.handle().pipe(
      map((payload: T) => {
        const statusCode = response.statusCode;
        const { data, meta } = this.extractPayload(payload);

        return {
          success: true,
          statusCode,
          message: this.getResponseMessage(context, statusCode),
          data,
          meta,
          timestamp: new Date().toISOString(),
          path: request.originalUrl ?? request.url,
        };
      }),
    );
  }

  private getResponseMessage(context: ExecutionContext, statusCode: number): string {
    return (
      this.reflector.getAllAndOverride<string>(RESPONSE_MESSAGE_METADATA, [context.getHandler(), context.getClass()]) ??
      getHttpStatusMessage(statusCode)
    );
  }

  private extractPayload(payload: T): Pick<ApiSuccessResponse<unknown>, 'data' | 'meta'> {
    if (payload === undefined) {
      return { data: null, meta: null };
    }

    if (this.hasDataWithMeta(payload)) {
      return {
        data: payload.data ?? null,
        meta: payload.meta ?? null,
      };
    }

    return { data: payload ?? null, meta: null };
  }

  private hasDataWithMeta(payload: unknown): payload is ApiDataWithMeta<unknown> {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      !Array.isArray(payload) &&
      Object.prototype.hasOwnProperty.call(payload, 'data') &&
      Object.prototype.hasOwnProperty.call(payload, 'meta')
    );
  }
}

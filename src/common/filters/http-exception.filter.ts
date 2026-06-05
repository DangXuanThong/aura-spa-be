import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ERROR_CODES } from '../constants/error-codes';
import { buildErrorResponse, ErrorResponse } from '../dto/api-response.dto';

interface HttpExceptionResponseBody {
  code?: string;
  message?: string | string[];
  error?: string;
  statusCode?: number;
}

function isHttpExceptionResponseBody(value: unknown): value is HttpExceptionResponseBody {
  return typeof value === 'object' && value !== null;
}

function resolveMessage(body: unknown, fallback: string): string {
  if (!isHttpExceptionResponseBody(body)) {
    return fallback;
  }

  if (Array.isArray(body.message)) {
    return body.message.join('; ');
  }

  return body.message ?? body.error ?? fallback;
}

function resolveCode(statusCode: number, body: unknown): string {
  if (isHttpExceptionResponseBody(body) && body.code) {
    return body.code;
  }

  if (statusCode === HttpStatus.NOT_FOUND) {
    return ERROR_CODES.NOT_FOUND;
  }

  if (statusCode === HttpStatus.FORBIDDEN) {
    return ERROR_CODES.FORBIDDEN;
  }

  if (statusCode === HttpStatus.UNAUTHORIZED) {
    return ERROR_CODES.TOKEN_INVALID;
  }

  if (statusCode === HttpStatus.BAD_REQUEST) {
    return ERROR_CODES.VALIDATION_ERROR;
  }

  return ERROR_CODES.INTERNAL_SERVER_ERROR;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    const statusCode = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';

    const responseBody: ErrorResponse = buildErrorResponse(
      resolveCode(statusCode, exceptionResponse),
      resolveMessage(exceptionResponse, 'Internal server error'),
    );

    response.status(statusCode).json(responseBody);
  }
}

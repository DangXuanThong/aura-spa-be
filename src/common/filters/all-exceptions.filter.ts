import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { getHttpStatusMessage } from '../helpers/http-status.helper';
import { ApiErrorResponse, ValidationErrorDetails } from '../interfaces/api-response.interface';
import { LoggerService } from 'src/logger/logger.service';

interface NormalizedException {
  message: string;
  error: string;
  errors?: ValidationErrorDetails;
}

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const httpContext = host.switchToHttp();
    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();
    const statusCode = this.getStatusCode(exception);
    const normalizedException = this.normalizeException(exception, statusCode);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logInternalError(exception);
    }

    const responseBody: ApiErrorResponse = {
      success: false,
      statusCode,
      message: normalizedException.message,
      error: normalizedException.error,
      timestamp: new Date().toISOString(),
      path: request.originalUrl ?? request.url,
    };

    if (normalizedException.errors) {
      responseBody.errors = normalizedException.errors;
    }

    response.status(statusCode).json(responseBody);
  }

  private getStatusCode(exception: unknown): number {
    return exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private normalizeException(exception: unknown, statusCode: number): NormalizedException {
    const statusMessage = getHttpStatusMessage(statusCode);

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      return {
        message: getHttpStatusMessage(HttpStatus.INTERNAL_SERVER_ERROR),
        error: statusMessage,
      };
    }

    if (!(exception instanceof HttpException)) {
      return {
        message: statusMessage,
        error: statusMessage,
      };
    }

    const exceptionResponse = exception.getResponse();

    if (typeof exceptionResponse === 'string') {
      return {
        message: exceptionResponse,
        error: statusMessage,
      };
    }

    if (!isRecord(exceptionResponse)) {
      return {
        message: statusMessage,
        error: statusMessage,
      };
    }

    return {
      message: normalizeMessage(exceptionResponse.message, statusMessage),
      error: normalizeMessage(exceptionResponse.error, statusMessage),
      errors: isValidationErrorDetails(exceptionResponse.errors) ? exceptionResponse.errors : undefined,
    };
  }

  private logInternalError(exception: unknown): void {
    if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack, AllExceptionsFilter.name);
      return;
    }

    this.logger.error(String(exception), undefined, AllExceptionsFilter.name);
  }
}

function normalizeMessage(value: unknown, fallback: string): string {
  if (Array.isArray(value)) {
    return value.join(', ');
  }

  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidationErrorDetails(value: unknown): value is ValidationErrorDetails {
  return (
    isRecord(value) && Object.values(value).every((messages) => Array.isArray(messages) && messages.every((message) => typeof message === 'string'))
  );
}

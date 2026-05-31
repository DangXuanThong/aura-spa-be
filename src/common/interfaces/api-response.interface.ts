export type ValidationErrorDetails = Record<string, string[]>;

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  statusCode: number;
  message: string;
  data: T | null;
  meta: Record<string, unknown> | null;
  timestamp: string;
  path: string;
}

export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  error: string;
  errors?: ValidationErrorDetails;
  timestamp: string;
  path: string;
}

export interface ApiDataWithMeta<T = unknown> {
  data: T;
  meta?: Record<string, unknown> | null;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  code: string;
  message: string;
}

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

export function buildSuccessResponse<T>(data: T): SuccessResponse<T> {
  return {
    success: true,
    data,
  };
}

export function buildErrorResponse(code: string, message: string): ErrorResponse {
  return {
    success: false,
    code,
    message,
  };
}

import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { lastValueFrom, of } from 'rxjs';
import { ApiResponseInterceptor } from './api-response.interceptor';

class TestController {}

function testHandler(): void {
  return undefined;
}

function createExecutionContext(statusCode = 200, path = '/tasks'): ExecutionContext {
  const request = { originalUrl: path, url: path } as Request;
  const response = { statusCode } as Response;

  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
    getHandler: () => testHandler,
    getClass: () => TestController,
  } as unknown as ExecutionContext;
}

function createCallHandler<T>(payload: T): CallHandler<T> {
  return {
    handle: () => of(payload),
  };
}

describe('ApiResponseInterceptor', () => {
  let reflector: Reflector;
  let interceptor: ApiResponseInterceptor<unknown>;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as Reflector;
    interceptor = new ApiResponseInterceptor(reflector);
  });

  it('should wrap object responses in the API envelope', async () => {
    const result = await lastValueFrom(interceptor.intercept(createExecutionContext(), createCallHandler({ id: 1, title: 'Task' })));

    expect(result).toMatchObject({
      success: true,
      statusCode: 200,
      message: 'OK',
      data: { id: 1, title: 'Task' },
      meta: null,
      path: '/tasks',
    });
    expect(result.timestamp).toEqual(expect.any(String));
  });

  it('should wrap array responses and keep meta as null by default', async () => {
    const result = await lastValueFrom(interceptor.intercept(createExecutionContext(), createCallHandler([{ id: 1 }, { id: 2 }])));

    expect(result.data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(result.meta).toBeNull();
  });

  it('should convert undefined responses to null data', async () => {
    const result = await lastValueFrom(interceptor.intercept(createExecutionContext(), createCallHandler(undefined)));

    expect(result.data).toBeNull();
    expect(result.meta).toBeNull();
  });

  it('should use custom response messages from metadata', async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue('Task created successfully');

    const result = await lastValueFrom(interceptor.intercept(createExecutionContext(201, '/tasks'), createCallHandler({ id: 1 })));

    expect(result.statusCode).toBe(201);
    expect(result.message).toBe('Task created successfully');
    expect(result.path).toBe('/tasks');
  });

  it('should lift data and meta when handlers return a paginated payload', async () => {
    const result = await lastValueFrom(
      interceptor.intercept(createExecutionContext(), createCallHandler({ data: [{ id: 1 }], meta: { total: 1, page: 1 } })),
    );

    expect(result.data).toEqual([{ id: 1 }]);
    expect(result.meta).toEqual({ total: 1, page: 1 });
  });
});

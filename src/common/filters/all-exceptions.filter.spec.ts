import { ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { Request, Response } from 'express';
import { LoggerService } from 'src/logger/logger.service';
import { ApiErrorResponse } from '../interfaces/api-response.interface';
import { AllExceptionsFilter } from './all-exceptions.filter';

interface MockResponse {
  status: jest.Mock;
  json: jest.Mock;
}

function createArgumentsHost(path = '/tasks'): { host: ArgumentsHost; response: MockResponse } {
  const request = { originalUrl: path, url: path } as Request;
  const response: MockResponse = {
    status: jest.fn(),
    json: jest.fn(),
  };
  response.status.mockReturnValue(response);

  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response as unknown as Response,
    }),
  } as unknown as ArgumentsHost;

  return { host, response };
}

describe('AllExceptionsFilter', () => {
  let logger: { error: jest.Mock };
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    logger = { error: jest.fn() };
    filter = new AllExceptionsFilter(logger as unknown as LoggerService);
  });

  it('should format HttpException responses', () => {
    const { host, response } = createArgumentsHost('/tasks/1');

    filter.catch(new NotFoundException('Task #1 not found'), host);

    expect(response.status).toHaveBeenCalledWith(404);
    const body = response.json.mock.calls[0][0] as ApiErrorResponse;
    expect(body).toMatchObject({
      success: false,
      statusCode: 404,
      message: 'Task #1 not found',
      error: 'Not Found',
      path: '/tasks/1',
    });
    expect(body.timestamp).toEqual(expect.any(String));
    expect(body).not.toHaveProperty('errors');
  });

  it('should include field errors for validation exceptions', () => {
    const { host, response } = createArgumentsHost('/tasks');
    const errors = {
      title: ['title should not be empty'],
    };

    filter.catch(new BadRequestException({ message: 'Validation failed', errors }), host);

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json.mock.calls[0][0]).toMatchObject({
      success: false,
      statusCode: 400,
      message: 'Validation failed',
      error: 'Bad Request',
      errors,
      path: '/tasks',
    });
  });

  it('should hide unknown error details behind a safe 500 response', () => {
    const { host, response } = createArgumentsHost('/tasks');

    filter.catch(new Error('database password leaked'), host);

    expect(response.status).toHaveBeenCalledWith(500);
    const body = response.json.mock.calls[0][0] as ApiErrorResponse;
    expect(body).toMatchObject({
      success: false,
      statusCode: 500,
      message: 'Internal Server Error',
      error: 'Internal Server Error',
      path: '/tasks',
    });
    expect(body).not.toHaveProperty('errors');
    expect(JSON.stringify(body)).not.toContain('database password leaked');
    expect(logger.error).toHaveBeenCalled();
  });
});

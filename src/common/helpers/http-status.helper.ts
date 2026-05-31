import { STATUS_CODES } from 'node:http';

export function getHttpStatusMessage(statusCode: number): string {
  return STATUS_CODES[statusCode] ?? 'Unknown Status';
}

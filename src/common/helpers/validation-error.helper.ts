import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import { ValidationErrorDetails } from '../interfaces/api-response.interface';

export function formatValidationErrors(errors: ValidationError[]): ValidationErrorDetails {
  return errors.reduce<ValidationErrorDetails>((accumulator, error) => {
    collectValidationError(error, error.property, accumulator);
    return accumulator;
  }, {});
}

export function createValidationException(errors: ValidationError[]): BadRequestException {
  return new BadRequestException({
    message: 'Validation failed',
    errors: formatValidationErrors(errors),
  });
}

function collectValidationError(error: ValidationError, propertyPath: string, accumulator: ValidationErrorDetails): void {
  const key = propertyPath || 'request';
  const messages = error.constraints ? Object.values(error.constraints) : [];

  if (messages.length > 0) {
    accumulator[key] = [...(accumulator[key] ?? []), ...messages];
  }

  for (const child of error.children ?? []) {
    const childPath = child.property ? `${key}.${child.property}` : key;
    collectValidationError(child, childPath, accumulator);
  }
}

import { registerDecorator, ValidationArguments, ValidationOptions } from 'class-validator';

const ISO_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/;
const US_SLASH_DATE_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s.*)?$/;

function isRealCalendarDate(year: number, month: number, day: number): boolean {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;

  const normalized = new Date(Date.UTC(year, month - 1, day));
  return normalized.getUTCFullYear() === year && normalized.getUTCMonth() === month - 1 && normalized.getUTCDate() === day;
}

function hasValidCalendarDate(value: string): boolean {
  const trimmed = value.trim();
  const isoMatch = ISO_DATE_RE.exec(trimmed);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    return isRealCalendarDate(Number(year), Number(month), Number(day));
  }

  const slashMatch = US_SLASH_DATE_RE.exec(trimmed);
  if (slashMatch) {
    const [, month, day, year] = slashMatch;
    return isRealCalendarDate(Number(year), Number(month), Number(day));
  }

  return true;
}

function calculateAge(dateOfBirth: Date, today = new Date()): number {
  let age = today.getFullYear() - dateOfBirth.getFullYear();
  const hasBirthdayPassed =
    today.getMonth() > dateOfBirth.getMonth() || (today.getMonth() === dateOfBirth.getMonth() && today.getDate() >= dateOfBirth.getDate());

  if (!hasBirthdayPassed) age -= 1;

  return age;
}

export function isDateOfBirth(value: unknown): boolean {
  if (typeof value !== 'string' || value.trim() === '') return false;
  if (!hasValidCalendarDate(value)) return false;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return false;

  const age = calculateAge(parsed);
  return age >= 10 && age <= 100;
}

export function IsDateOfBirth(validationOptions?: ValidationOptions): PropertyDecorator {
  return (object: object, propertyName: string | symbol) => {
    registerDecorator({
      name: 'isDateOfBirth',
      target: object.constructor,
      propertyName: propertyName.toString(),
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return isDateOfBirth(value);
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be a valid date and age must be between 10 and 100 years`;
        },
      },
    });
  };
}

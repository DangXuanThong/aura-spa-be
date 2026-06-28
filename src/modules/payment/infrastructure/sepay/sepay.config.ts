import { registerAs } from '@nestjs/config';

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

export const sepayConfig = registerAs('sepay', () => ({
  webhookSecret: process.env.SEPAY_WEBHOOK_SECRET ?? '',
  bankAccount: process.env.SEPAY_BANK_ACCOUNT ?? '',
  bankCode: process.env.SEPAY_BANK_CODE ?? 'Vietcombank',
  paymentCodePrefix: process.env.SEPAY_PAYMENT_CODE_PREFIX ?? 'ABK',
  depositPercent: readNumber(process.env.BOOKING_DEPOSIT_PERCENT, 30),
  depositExpireMinutes: readNumber(process.env.BOOKING_DEPOSIT_EXPIRE_MINUTES, 15),
}));

export type SepayConfig = ReturnType<typeof sepayConfig>;

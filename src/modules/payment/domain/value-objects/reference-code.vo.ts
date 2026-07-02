/**
 * SePay payment code embedded in bank transfer content.
 * Format: {PREFIX}{zeroPaddedBookingId} — e.g. ABK00000042
 *
 * Prefix must match SePay company config (my.sepay.vn → Cấu trúc mã thanh toán).
 */
export class ReferenceCode {
  private constructor(readonly value: string) {}

  static generate(bookingId: string, prefix = 'ABK'): ReferenceCode {
    const normalizedPrefix = prefix.trim().toUpperCase();
    if (normalizedPrefix.length < 2 || normalizedPrefix.length > 5) {
      throw new Error(`Payment code prefix must be 2-5 characters, got "${normalizedPrefix}"`);
    }

    const numericId = bookingId.replace(/\D/g, '');
    if (!numericId) {
      throw new Error(`Invalid booking id for reference code: ${bookingId}`);
    }

    const suffix = numericId.padStart(8, '0').slice(-8);
    return new ReferenceCode(`${normalizedPrefix}${suffix}`);
  }

  static from(value: string): ReferenceCode {
    const trimmed = value?.trim();
    if (!trimmed) {
      throw new Error('Reference code cannot be empty');
    }
    return new ReferenceCode(trimmed.toUpperCase());
  }

  toString(): string {
    return this.value;
  }
}

import { ApiProperty } from '@nestjs/swagger';
import { PaymentTransactionStatus } from '../../domain/enums/payment-transaction-status.enum';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';

export class DepositPaymentResponseDto {
  @ApiProperty({ example: '1' })
  paymentTransactionId!: string;

  @ApiProperty({ example: '42' })
  bookingId!: string;

  @ApiProperty({ example: 'ABK00000042' })
  referenceCode!: string;

  @ApiProperty({ example: 105000, description: 'Deposit amount in VND' })
  amount!: number;

  @ApiProperty({ enum: PaymentTransactionStatus, example: PaymentTransactionStatus.Pending })
  paymentStatus!: PaymentTransactionStatus;

  @ApiProperty({ enum: BookingStatus, example: BookingStatus.PendingPayment })
  bookingStatus!: BookingStatus;

  @ApiProperty({
    example: 'https://qr.sepay.vn/img?acc=1234567890&bank=Vietcombank&amount=105000&des=ABK00000042&template=compact',
  })
  qrImageUrl!: string;

  @ApiProperty({ example: '2026-06-22T10:15:00.000Z' })
  expiresAt!: Date;

  @ApiProperty({ example: '2026-06-22T10:00:00.000Z', nullable: true })
  paidAt!: Date | null;
}

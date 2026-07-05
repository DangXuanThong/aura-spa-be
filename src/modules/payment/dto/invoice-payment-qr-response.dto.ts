import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '../enums/invoice-status.enum';
import { PaymentTransactionStatus } from '../domain/enums/payment-transaction-status.enum';

export class InvoicePaymentQrResponseDto {
  @ApiProperty({ example: '1' })
  paymentTransactionId!: string;

  @ApiProperty({ example: '1' })
  invoiceId!: string;

  @ApiPropertyOptional({ example: '42' })
  bookingId!: string | null;

  @ApiProperty({ example: 'ABK50000001' })
  referenceCode!: string;

  @ApiProperty({ example: 720000, description: 'Invoice remaining amount in VND' })
  amount!: number;

  @ApiProperty({ enum: PaymentTransactionStatus, example: PaymentTransactionStatus.Pending })
  paymentStatus!: PaymentTransactionStatus;

  @ApiProperty({ enum: InvoiceStatus, example: InvoiceStatus.PartiallyPaid })
  invoiceStatus!: InvoiceStatus;

  @ApiProperty({
    example: 'https://qr.sepay.vn/img?acc=1234567890&bank=Vietcombank&amount=720000&des=ABK50000001&template=compact',
  })
  qrImageUrl!: string;

  @ApiProperty({ example: '2026-06-22T10:15:00.000Z' })
  expiresAt!: Date;

  @ApiPropertyOptional({ example: '2026-06-22T10:00:00.000Z', nullable: true })
  paidAt!: Date | null;
}

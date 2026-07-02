import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';
import { PaymentType } from '../enums/payment-type.enum';

export class PaymentResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiPropertyOptional({ example: '1' })
  invoiceId!: string | null;

  @ApiPropertyOptional({ example: '42' })
  bookingId!: string | null;

  @ApiProperty({ example: '10' })
  customerId!: string;

  @ApiProperty({ example: '1' })
  branchId!: string;

  @ApiProperty({ enum: PaymentType, enumName: 'PaymentType' })
  paymentType!: PaymentType;

  @ApiProperty({ enum: PaymentMethod, enumName: 'PaymentMethod' })
  paymentMethod!: PaymentMethod;

  @ApiProperty({ enum: PaymentStatus, enumName: 'PaymentStatus' })
  status!: PaymentStatus;

  @ApiProperty({ example: 350000 })
  amount!: number;

  @ApiPropertyOptional({ example: '2026-06-17T10:00:00.000Z' })
  paidAt!: Date | null;

  @ApiPropertyOptional({ example: '5' })
  receivedBy!: string | null;

  @ApiProperty({ example: 0 })
  refundedAmount!: number;

  @ApiPropertyOptional({ example: null })
  refundReason!: string | null;

  @ApiProperty({ example: '2026-06-17T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-17T10:00:00.000Z' })
  updatedAt!: Date;
}

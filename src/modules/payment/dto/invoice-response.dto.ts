import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InvoiceStatus } from '../enums/invoice-status.enum';
import { InvoiceItemResponseDto } from './invoice-item-response.dto';

export class InvoiceResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'INV-HCM-Q1-20260617-42' })
  invoiceNumber!: string;

  @ApiPropertyOptional({ example: '42' })
  bookingId!: string | null;

  @ApiProperty({ example: '10' })
  customerId!: string;

  @ApiProperty({ example: '1' })
  branchId!: string;

  @ApiProperty({ enum: InvoiceStatus, enumName: 'InvoiceStatus' })
  status!: InvoiceStatus;

  @ApiProperty({ example: 350000 })
  subtotalAmount!: number;

  @ApiProperty({ example: 0 })
  discountAmount!: number;

  @ApiProperty({ example: 0 })
  taxAmount!: number;

  @ApiProperty({ example: 350000 })
  totalAmount!: number;

  @ApiProperty({ example: 0 })
  paidAmount!: number;

  @ApiProperty({ example: 350000 })
  remainingAmount!: number;

  @ApiPropertyOptional({ example: '2026-06-17T10:00:00.000Z' })
  issuedAt!: Date | null;

  @ApiProperty({ type: [InvoiceItemResponseDto] })
  @Type(() => InvoiceItemResponseDto)
  items!: InvoiceItemResponseDto[];

  @ApiProperty({ example: '2026-06-17T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-17T10:00:00.000Z' })
  updatedAt!: Date;
}
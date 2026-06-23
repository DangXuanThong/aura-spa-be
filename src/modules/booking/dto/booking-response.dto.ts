import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from '../enums/booking-status.enum';
import { BookingSource } from '../enums/booking-source.enum';

export class BookingServiceItemDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '2' })
  serviceId!: string;

  @ApiProperty({ example: 1 })
  quantity!: number;

  @ApiProperty({ example: 60 })
  durationMinutes!: number;

  @ApiProperty({ example: 350000 })
  unitPrice!: number;

  @ApiProperty({ example: 0 })
  discountAmount!: number;

  @ApiProperty({ example: 350000 })
  finalAmount!: number;
}

export class BookingResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '42' })
  customerId!: string;

  @ApiProperty({ example: '1' })
  branchId!: string;

  @ApiPropertyOptional({ example: '7' })
  technicianId!: string | null;

  @ApiProperty({ example: '2026-06-20T02:00:00.000Z' })
  startTime!: Date;

  @ApiProperty({ example: '2026-06-20T03:00:00.000Z' })
  endTime!: Date;

  @ApiProperty({ enum: BookingStatus, enumName: 'BookingStatus', example: BookingStatus.Confirmed })
  status!: BookingStatus;

  @ApiProperty({ enum: BookingSource, enumName: 'BookingSource', example: BookingSource.Online })
  source!: BookingSource;

  @ApiProperty({ example: 350000 })
  subtotalAmount!: number;

  @ApiProperty({ example: 0 })
  discountAmount!: number;

  @ApiProperty({ example: 0 })
  depositRequiredAmount!: number;

  @ApiProperty({ example: 0 })
  paidAmount!: number;

  @ApiProperty({ example: 350000 })
  remainingAmount!: number;

  @ApiPropertyOptional({ example: 'Please use fragrance-free products.' })
  notes!: string | null;

  @ApiProperty({ type: [BookingServiceItemDto] })
  services!: BookingServiceItemDto[];

  @ApiProperty({ example: '2026-06-20T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-20T00:00:00.000Z' })
  updatedAt!: Date;
}

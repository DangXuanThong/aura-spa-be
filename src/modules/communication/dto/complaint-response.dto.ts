import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ComplaintStatus } from '../enums/complaint-status.enum';

export class ComplaintCustomerDto {
  @ApiProperty({ example: '42' })
  id!: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  fullName!: string;

  @ApiPropertyOptional({ example: 'a@gmail.com' })
  email!: string | null;
}

export class ComplaintResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '42' })
  customerId!: string;

  @ApiProperty({ example: '1' })
  branchId!: string;

  @ApiPropertyOptional({ example: '5' })
  bookingId!: string | null;

  @ApiProperty({ example: 'Technician was rude' })
  title!: string;

  @ApiProperty({ example: 'The technician spoke rudely during my appointment.' })
  description!: string;

  @ApiProperty({ enum: ComplaintStatus, example: ComplaintStatus.Open })
  status!: ComplaintStatus;

  @ApiPropertyOptional({ example: '7' })
  assignedTo!: string | null;

  @ApiPropertyOptional({ example: 'We have spoken to the technician and taken corrective action.' })
  resolutionNote!: string | null;

  @ApiPropertyOptional({ example: '2026-06-19T10:00:00.000Z' })
  resolvedAt!: Date | null;

  @ApiProperty({ type: ComplaintCustomerDto })
  @Type(() => ComplaintCustomerDto)
  customer!: ComplaintCustomerDto;

  @ApiProperty({ example: '2026-06-18T08:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-18T08:00:00.000Z' })
  updatedAt!: Date;
}

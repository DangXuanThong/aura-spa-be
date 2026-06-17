import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWalkInBookingDto {
  @ApiProperty({ example: '42', description: 'Customer to book for' })
  @IsNotEmpty()
  @IsString()
  customerId!: string;

  @ApiProperty({ example: '1', description: 'Branch where the walk-in is being served' })
  @IsNotEmpty()
  @IsString()
  branchId!: string;

  @ApiProperty({ example: '2', description: 'Service to perform' })
  @IsNotEmpty()
  @IsString()
  serviceId!: string;

  @ApiPropertyOptional({ example: '7', description: 'Assigned technician (must be active at the branch)' })
  @IsOptional()
  @IsString()
  technicianId?: string;

  @ApiProperty({ example: '2026-06-17T10:00:00+07:00', description: 'Appointment start time — must be today' })
  @IsDateString()
  startTime!: string;

  @ApiPropertyOptional({ example: 'First-time visit.' })
  @IsOptional()
  @IsString()
  notes?: string;
}

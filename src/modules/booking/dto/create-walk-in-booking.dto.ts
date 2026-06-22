import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateWalkInBookingDto {
  @ApiPropertyOptional({ example: '42', description: 'Existing customer to book for. Optional when customerName and customerPhone are provided.' })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({ example: 'Nguyen Van A', description: 'Walk-in customer name. Used to create a quick customer account when customerId is not provided.' })
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional({ example: '0912345678', description: 'Walk-in customer phone. Used to find or create a customer account.' })
  @IsOptional()
  @IsString()
  customerPhone?: string;

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

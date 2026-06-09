import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDecimal, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class CreateBranchServiceDto {
  @ApiProperty({ description: 'Branch ID', format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  branchId!: string;

  @ApiProperty({ description: 'Service ID', format: 'uuid' })
  @IsNotEmpty()
  @IsUUID()
  serviceId!: string;

  @ApiPropertyOptional({ description: 'Is this service enabled for this branch', default: true })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Override service duration in minutes for this branch' })
  @IsOptional()
  @IsInt()
  @Min(1)
  durationMinutesOverride?: number;

  @ApiPropertyOptional({ description: 'Override service price for this branch' })
  @IsOptional()
  @IsDecimal()
  @Min(0)
  priceOverride?: number;

  @ApiPropertyOptional({ description: 'Maximum parallel bookings for this service at this branch' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxParallelBookings?: number;
}

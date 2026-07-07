import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNumber, IsOptional, Max, Min } from 'class-validator';

export class UpdateBranchServiceDto {
  @ApiPropertyOptional({ description: 'Is this service enabled for this branch' })
  @IsOptional()
  @IsBoolean()
  isEnabled?: boolean;

  @ApiPropertyOptional({ description: 'Override service duration in minutes for this branch' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(480)
  durationMinutesOverride?: number;

  @ApiPropertyOptional({ description: 'Override service price for this branch' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  priceOverride?: number;

  @ApiPropertyOptional({ description: 'Maximum parallel bookings for this service at this branch' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  maxParallelBookings?: number;
}

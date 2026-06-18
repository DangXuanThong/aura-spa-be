import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsInt, IsOptional, Matches, Min } from 'class-validator';

export class UpdateSlotConfigDto {
  @ApiPropertyOptional({ example: 3, description: 'Max concurrent bookings per slot' })
  @IsOptional()
  @IsInt()
  @Min(1)
  maxBookings?: number;

  @ApiPropertyOptional({ example: 60, description: 'Slot interval in minutes' })
  @IsOptional()
  @IsInt()
  @Min(15)
  slotMinutes?: number;

  @ApiPropertyOptional({ example: '09:00', description: 'Opening time HH:MM' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'startTime must be HH:MM' })
  startTime?: string;

  @ApiPropertyOptional({ example: '20:00', description: 'Closing time HH:MM' })
  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/, { message: 'endTime must be HH:MM' })
  endTime?: string;

  @ApiPropertyOptional({ example: '2026-12-31', description: 'Date this config expires (null = indefinite)' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string | null;
}

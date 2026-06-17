import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RescheduleBookingDto {
  @ApiProperty({ example: '2026-06-25T10:00:00+07:00', description: 'New booking start time (ISO 8601)' })
  @IsNotEmpty()
  @IsDateString()
  startTime!: string;

  @ApiPropertyOptional({ example: '7', description: 'New preferred technician (must be assigned to the same branch)' })
  @IsOptional()
  @IsString()
  technicianId?: string;
}

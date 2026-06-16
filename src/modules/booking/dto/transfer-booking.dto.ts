import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class TransferBookingDto {
  @ApiProperty({ example: '2', description: 'Target branch to transfer the appointment to' })
  @IsNotEmpty()
  @IsString()
  targetBranchId!: string;

  @ApiProperty({ example: '2026-06-25T10:00:00+07:00', description: 'New booking start time at the destination branch (ISO 8601)' })
  @IsNotEmpty()
  @IsDateString()
  startTime!: string;

  @ApiPropertyOptional({ example: '9', description: 'Preferred technician at the destination branch' })
  @IsOptional()
  @IsString()
  technicianId?: string;
}

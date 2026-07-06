import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class AssignShiftDto {
  @ApiProperty({ example: '3' })
  @IsNotEmpty()
  @IsString()
  staffId!: string;

  @ApiProperty({ example: '1' })
  @IsNotEmpty()
  @IsString()
  branchId!: string;

  @ApiProperty({ example: '2026-07-06' })
  @IsNotEmpty()
  @IsString()
  date!: string;

  @ApiProperty({ example: '08:00' })
  @IsNotEmpty()
  @IsString()
  startTime!: string;

  @ApiProperty({ example: '14:00' })
  @IsNotEmpty()
  @IsString()
  endTime!: string;

  @ApiPropertyOptional({ example: 'work_shift' })
  @IsOptional()
  @IsString()
  requestType?: string;
}

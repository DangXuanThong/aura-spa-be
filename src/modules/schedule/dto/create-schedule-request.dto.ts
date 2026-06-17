import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ScheduleRequestType } from '../enums/schedule-request-type.enum';

export class CreateScheduleRequestDto {
  @ApiProperty({ example: '1', description: 'Branch to register the schedule at' })
  @IsNotEmpty()
  @IsString()
  branchId!: string;

  @ApiProperty({ enum: ScheduleRequestType, enumName: 'ScheduleRequestType', example: ScheduleRequestType.WorkShift })
  @IsEnum(ScheduleRequestType)
  requestType!: ScheduleRequestType;

  @ApiProperty({ example: '2026-06-20T08:00:00+07:00', description: 'Start of the requested shift or leave period' })
  @IsDateString()
  requestedStart!: string;

  @ApiProperty({ example: '2026-06-20T17:00:00+07:00', description: 'End of the requested shift or leave period' })
  @IsDateString()
  requestedEnd!: string;

  @ApiPropertyOptional({ example: 'Personal appointment in the morning.' })
  @IsOptional()
  @IsString()
  reason?: string;
}

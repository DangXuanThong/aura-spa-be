import { ApiProperty } from '@nestjs/swagger';
import { ScheduleType } from '../enums/schedule-type.enum';
import { ScheduleStatus } from '../enums/schedule-status.enum';

export class StaffShiftResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '1' })
  branchId!: string;

  @ApiProperty({ enum: ScheduleType, enumName: 'ScheduleType' })
  scheduleType!: ScheduleType;

  @ApiProperty({ enum: ScheduleStatus, enumName: 'ScheduleStatus' })
  status!: ScheduleStatus;

  @ApiProperty({ example: '2026-06-20T01:00:00.000Z' })
  startTime!: Date;

  @ApiProperty({ example: '2026-06-20T10:00:00.000Z' })
  endTime!: Date;
}

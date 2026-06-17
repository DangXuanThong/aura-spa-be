import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleRequestType } from '../enums/schedule-request-type.enum';
import { ApprovalStatus } from '../enums/approval-status.enum';

export class ScheduleRequestResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '7' })
  staffId!: string;

  @ApiProperty({ example: '1' })
  branchId!: string;

  @ApiProperty({ enum: ScheduleRequestType, enumName: 'ScheduleRequestType' })
  requestType!: ScheduleRequestType;

  @ApiProperty({ example: '2026-06-20T01:00:00.000Z' })
  requestedStart!: Date;

  @ApiProperty({ example: '2026-06-20T10:00:00.000Z' })
  requestedEnd!: Date;

  @ApiProperty({ enum: ApprovalStatus, enumName: 'ApprovalStatus' })
  status!: ApprovalStatus;

  @ApiPropertyOptional({ example: 'Personal appointment in the morning.' })
  reason!: string | null;

  @ApiPropertyOptional({ example: '3' })
  reviewedBy!: string | null;

  @ApiPropertyOptional({ example: '2026-06-18T09:00:00.000Z' })
  reviewedAt!: Date | null;

  @ApiProperty({ example: '2026-06-17T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-17T10:00:00.000Z' })
  updatedAt!: Date;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TreatmentCourseStatus } from '../enums/treatment-course-status.enum';
import { TreatmentSessionResponseDto } from './treatment-session-response.dto';

export class TreatmentCourseResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '42' })
  customerId!: string;

  @ApiProperty({ example: '2' })
  serviceId!: string;

  @ApiPropertyOptional({ example: '1' })
  branchId!: string | null;

  @ApiProperty({ example: 5 })
  totalSessions!: number;

  @ApiProperty({ example: 2 })
  usedSessions!: number;

  @ApiProperty({ example: 3 })
  remainingSessions!: number;

  @ApiProperty({ enum: TreatmentCourseStatus, enumName: 'TreatmentCourseStatus', example: TreatmentCourseStatus.Active })
  status!: TreatmentCourseStatus;

  @ApiPropertyOptional({ example: '2026-06-01T00:00:00.000Z' })
  startedAt!: Date | null;

  @ApiPropertyOptional({ example: '2027-06-01T00:00:00.000Z' })
  expiresAt!: Date | null;

  @ApiProperty({ type: [TreatmentSessionResponseDto] })
  @Type(() => TreatmentSessionResponseDto)
  sessions!: TreatmentSessionResponseDto[];

  @ApiProperty({ example: '2026-06-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-10T00:00:00.000Z' })
  updatedAt!: Date;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TreatmentSessionStatus } from '../enums/treatment-session-status.enum';

export class TreatmentSessionResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 1 })
  sessionNumber!: number;

  @ApiProperty({ enum: TreatmentSessionStatus, enumName: 'TreatmentSessionStatus', example: TreatmentSessionStatus.Completed })
  status!: TreatmentSessionStatus;

  @ApiPropertyOptional({ example: '42' })
  bookingId!: string | null;

  @ApiPropertyOptional({ example: '7' })
  staffId!: string | null;

  @ApiPropertyOptional({ example: 'Da cải thiện rõ rệt sau buổi 2.' })
  progressNote!: string | null;

  @ApiPropertyOptional({ type: [String] })
  beforeImages!: string[] | null;

  @ApiPropertyOptional({ type: [String] })
  afterImages!: string[] | null;

  @ApiPropertyOptional({ example: 'Uong du nuoc, tranh xong hoi va duong am nhe sau tri lieu.' })
  careRecommendation!: string | null;

  @ApiPropertyOptional({ example: '2026-07-20T03:00:00.000Z' })
  nextRecommendedAt!: Date | null;

  @ApiPropertyOptional({ example: '2026-07-19T03:00:00.000Z' })
  reminderSentAt!: Date | null;

  @ApiPropertyOptional({ example: '2026-06-10T10:00:00.000Z' })
  completedAt!: Date | null;
}

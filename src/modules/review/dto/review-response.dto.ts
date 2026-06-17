import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReviewStatus } from '../enums/review-status.enum';

export class ReviewResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '42' })
  customerId!: string;

  @ApiProperty({ example: '10' })
  bookingId!: string;

  @ApiPropertyOptional({ example: '2' })
  serviceId!: string | null;

  @ApiProperty({ example: '1' })
  branchId!: string;

  @ApiPropertyOptional({ example: '7' })
  technicianId!: string | null;

  @ApiProperty({ example: 5 })
  rating!: number;

  @ApiPropertyOptional({ example: 'Nhân viên rất tận tâm, da mình cải thiện rõ rệt!' })
  comment!: string | null;

  @ApiProperty({ enum: ReviewStatus, enumName: 'ReviewStatus', example: ReviewStatus.Published })
  status!: ReviewStatus;

  @ApiPropertyOptional({ example: 'Cảm ơn bạn đã tin tưởng Aura Spa!' })
  replyText!: string | null;

  @ApiPropertyOptional({ example: '2026-06-18T09:00:00.000Z' })
  repliedAt!: Date | null;

  @ApiProperty({ example: '2026-06-17T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-17T10:00:00.000Z' })
  updatedAt!: Date;
}

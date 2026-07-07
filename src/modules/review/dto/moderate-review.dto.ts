import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { ReviewStatus } from '../enums/review-status.enum';

const MODERATABLE_STATUSES = [ReviewStatus.Hidden, ReviewStatus.Removed, ReviewStatus.Published] as const;

export class ModerateReviewDto {
  @ApiProperty({ enum: MODERATABLE_STATUSES, description: 'Target moderation status' })
  @IsEnum(MODERATABLE_STATUSES, { message: 'status must be one of: hidden, removed, published' })
  status!: ReviewStatus;
}

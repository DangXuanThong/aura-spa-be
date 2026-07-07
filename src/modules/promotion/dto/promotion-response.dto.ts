import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountType } from '../enums/discount-type.enum';
import { PromotionStatus } from '../enums/promotion-status.enum';

export class PromotionResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'SUMMER2025' })
  code!: string;

  @ApiProperty({ example: 'Summer Skincare Promotion' })
  name!: string;

  @ApiPropertyOptional({ example: 'Get 20% off all facial treatments this summer.' })
  description!: string | null;

  @ApiPropertyOptional({ example: '1', description: 'null = system-wide' })
  branchId!: string | null;

  @ApiProperty({ enum: DiscountType, enumName: 'DiscountType', example: DiscountType.Percentage })
  discountType!: DiscountType;

  @ApiProperty({ example: 20 })
  discountValue!: number;

  @ApiPropertyOptional({ example: 200000, description: 'Cap on discount amount (percentage type only)' })
  maxDiscountAmount!: number | null;

  @ApiPropertyOptional({ example: 100000, description: 'Minimum order amount to apply promotion' })
  minOrderAmount!: number | null;

  @ApiPropertyOptional({ example: 100 })
  usageLimitTotal!: number | null;

  @ApiPropertyOptional({ example: 1 })
  usageLimitPerCustomer!: number | null;

  @ApiPropertyOptional({ example: 'Aura Gold', description: 'Minimum membership tier required' })
  eligibleCustomerTier!: string | null;

  @ApiPropertyOptional({ example: 1000, description: 'Minimum current loyalty points balance required' })
  minPointsBalance!: number | null;

  @ApiProperty({ example: false })
  firstBookingOnly!: boolean;

  @ApiProperty({ example: 42 })
  usedCount!: number;

  @ApiProperty({ example: '2025-06-01T00:00:00.000Z' })
  startsAt!: Date;

  @ApiProperty({ example: '2025-08-31T23:59:59.000Z' })
  endsAt!: Date;

  @ApiProperty({ enum: PromotionStatus, enumName: 'PromotionStatus', example: PromotionStatus.Active })
  status!: PromotionStatus;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}

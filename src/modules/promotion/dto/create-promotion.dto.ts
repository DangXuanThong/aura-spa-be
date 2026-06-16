import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
import { DiscountType } from '../enums/discount-type.enum';
import { PromotionStatus } from '../enums/promotion-status.enum';

export class CreatePromotionDto {
  @ApiProperty({ example: 'SUMMER2025' })
  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  code!: string;

  @ApiProperty({ example: 'Summer Skincare Promotion' })
  @IsNotEmpty()
  @IsString()
  @Length(1, 255)
  name!: string;

  @ApiPropertyOptional({ example: 'Get 20% off all facial treatments this summer.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: '1', description: 'Omit or null for system-wide promotion' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ enum: DiscountType, enumName: 'DiscountType', example: DiscountType.Percentage })
  @IsEnum(DiscountType)
  discountType!: DiscountType;

  @ApiProperty({ example: 20 })
  @IsNumber()
  @Min(0)
  discountValue!: number;

  @ApiPropertyOptional({ example: 200000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxDiscountAmount?: number;

  @ApiPropertyOptional({ example: 100000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  minOrderAmount?: number;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimitTotal?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimitPerCustomer?: number;

  @ApiProperty({ example: '2025-06-01T00:00:00.000Z' })
  @IsDateString()
  startsAt!: string;

  @ApiProperty({ example: '2025-08-31T23:59:59.000Z' })
  @IsDateString()
  endsAt!: string;

  @ApiPropertyOptional({ enum: PromotionStatus, enumName: 'PromotionStatus', default: PromotionStatus.Draft })
  @IsOptional()
  @IsEnum(PromotionStatus)
  status?: PromotionStatus;
}

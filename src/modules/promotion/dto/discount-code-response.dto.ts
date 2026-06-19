import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DiscountCodeStatus } from '../enums/discount-code-status.enum';

export class DiscountCodeResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '1' })
  promotionId!: string;

  @ApiProperty({ example: 'VIP2025' })
  code!: string;

  @ApiPropertyOptional({ example: 500 })
  usageLimitTotal!: number | null;

  @ApiPropertyOptional({ example: 1 })
  usageLimitPerCustomer!: number | null;

  @ApiProperty({ example: 0 })
  usedCount!: number;

  @ApiProperty({ enum: DiscountCodeStatus, enumName: 'DiscountCodeStatus', example: DiscountCodeStatus.Active })
  status!: DiscountCodeStatus;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}

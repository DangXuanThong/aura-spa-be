import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, Length, Min } from 'class-validator';
import { DiscountCodeStatus } from '../enums/discount-code-status.enum';

export class CreateDiscountCodeDto {
  @ApiProperty({ example: 'VIP2025' })
  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  code!: string;

  @ApiPropertyOptional({ example: 500 })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimitTotal?: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  usageLimitPerCustomer?: number;

  @ApiPropertyOptional({ enum: DiscountCodeStatus, enumName: 'DiscountCodeStatus', default: DiscountCodeStatus.Active })
  @IsOptional()
  @IsEnum(DiscountCodeStatus)
  status?: DiscountCodeStatus;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class RedeemPointsDto {
  @ApiProperty({ example: 100, description: 'Number of loyalty points to redeem' })
  @IsInt()
  @Min(1)
  points!: number;

  @ApiPropertyOptional({ example: 'Redeem points for booking discount' })
  @IsOptional()
  @IsString()
  description?: string;
}

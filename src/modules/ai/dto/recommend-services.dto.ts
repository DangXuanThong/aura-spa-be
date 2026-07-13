import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class RecommendServicesDto {
  @ApiPropertyOptional({ description: 'Nhu cầu khách mô tả bằng ngôn ngữ tự nhiên' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  needText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  budgetMax?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(300)
  preferredDuration?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiPropertyOptional({ default: 'vi' })
  @IsOptional()
  @IsString()
  locale?: string;
}

export type RecommendItemDto = {
  serviceId: string;
  code: string;
  name: string;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  durationMinutes: number;
  price: number;
  score: number;
  reasons: string[];
  caveats: string[];
  bookingDeepLink: string;
};

export type RecommendServicesResponseDto = {
  recommendations: RecommendItemDto[];
  meta: {
    source: 'openai' | 'heuristic';
    personalized: boolean;
    healthFiltered: boolean;
    disclaimer: string;
    emptyReason?: string;
  };
};

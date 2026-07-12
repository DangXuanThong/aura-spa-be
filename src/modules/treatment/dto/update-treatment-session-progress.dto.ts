import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateTreatmentSessionProgressDto {
  @ApiPropertyOptional({
    example: 'Khach giam cang co ro ret, vung vai gay mem hon sau buoi tri lieu.',
    description: 'Professional progress note recorded by staff after a treatment session.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  progressNote?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['https://cdn.auraspa.vn/treatments/before-session-2.jpg'],
    description: 'Optional before-treatment image URLs.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  beforeImages?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['https://cdn.auraspa.vn/treatments/after-session-2.jpg'],
    description: 'Optional after-treatment image URLs.',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  afterImages?: string[];

  @ApiPropertyOptional({
    example: 'Uong du nuoc, tranh xong hoi va theo doi phan ung cua da trong 24 gio.',
    description: 'After-care recommendation for the customer after this treatment session.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  careRecommendation?: string;

  @ApiPropertyOptional({
    example: '2026-07-20T03:00:00.000Z',
    description: 'Recommended date/time for the next treatment session.',
  })
  @IsOptional()
  @IsDateString()
  nextRecommendedAt?: string;
}

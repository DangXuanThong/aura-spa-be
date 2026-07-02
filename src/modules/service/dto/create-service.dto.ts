import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString, IsUrl, Length, Matches, Min } from 'class-validator';
import { ServiceStatus } from '../enums/service-status.enum';

export class CreateServiceDto {
  @ApiProperty({ description: 'Service code', example: 'SRV001' })
  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  code!: string;

  @ApiProperty({ description: 'Service name', example: 'Swedish Massage' })
  @IsNotEmpty()
  @IsString()
  @Length(1, 150)
  name!: string;

  @ApiProperty({ description: 'Service slug for URL', example: 'swedish-massage' })
  @IsNotEmpty()
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug must contain only lowercase letters, digits, and hyphens (no leading/trailing hyphens)' })
  @Length(1, 255)
  slug!: string;

  @ApiPropertyOptional({ description: 'Service category', example: 'Massage' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  category?: string;

  @ApiPropertyOptional({ description: 'Service description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Service illustration image URL' })
  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @ApiProperty({ description: 'Default duration in minutes', example: 60 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  defaultDurationMinutes!: number;

  @ApiProperty({ description: 'Default price', example: 99.99 })
  @IsNotEmpty()
  @IsNumber()
  @IsPositive()
  defaultPrice!: number;

  @ApiPropertyOptional({ description: 'Service status', enum: ServiceStatus, default: ServiceStatus.Active })
  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;

  @ApiPropertyOptional({ description: 'Is multi-session service', example: false })
  @IsOptional()
  @IsBoolean()
  isMultiSession?: boolean;

  @ApiPropertyOptional({ description: 'Total sessions if multi-session', example: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  totalSessions?: number;
}

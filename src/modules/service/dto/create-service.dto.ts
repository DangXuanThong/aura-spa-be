import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsDecimal, IsInt, IsNotEmpty, IsOptional, IsString, Length, Min } from 'class-validator';
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
  @IsString()
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

  @ApiProperty({ description: 'Default duration in minutes', example: 60 })
  @IsNotEmpty()
  @IsInt()
  @Min(1)
  defaultDurationMinutes!: number;

  @ApiProperty({ description: 'Default price', example: 99.99 })
  @IsNotEmpty()
  @IsDecimal()
  defaultPrice!: number;

  @ApiPropertyOptional({ description: 'Service status', enum: ServiceStatus, default: ServiceStatus.Active })
  @IsOptional()
  @IsString()
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

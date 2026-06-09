import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDecimal, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';
import { BranchStatus } from '../enums/branch-status.enum';

export class CreateBranchDto {
  @ApiProperty({ description: 'Branch code', example: 'BR001' })
  @IsNotEmpty()
  @IsString()
  @Length(1, 50)
  code!: string;

  @ApiProperty({ description: 'Branch name', example: 'Downtown Spa' })
  @IsNotEmpty()
  @IsString()
  @Length(1, 150)
  name!: string;

  @ApiProperty({ description: 'Branch address', example: '123 Main Street' })
  @IsNotEmpty()
  @IsString()
  address!: string;

  @ApiProperty({ description: 'City', example: 'New York' })
  @IsNotEmpty()
  @IsString()
  @Length(1, 100)
  city!: string;

  @ApiPropertyOptional({ description: 'District/Region', example: 'Manhattan' })
  @IsOptional()
  @IsString()
  @Length(1, 100)
  district?: string;

  @ApiProperty({ description: 'Latitude coordinate', example: 40.7128 })
  @IsNotEmpty()
  @IsDecimal()
  latitude!: number;

  @ApiProperty({ description: 'Longitude coordinate', example: -74.006 })
  @IsNotEmpty()
  @IsDecimal()
  longitude!: number;

  @ApiPropertyOptional({ description: 'Phone number', example: '+1-555-0123' })
  @IsOptional()
  @IsString()
  @Length(1, 20)
  phone?: string;

  @ApiPropertyOptional({ description: 'Branch status', enum: BranchStatus, default: BranchStatus.Active })
  @IsOptional()
  @IsString()
  status?: BranchStatus;
}

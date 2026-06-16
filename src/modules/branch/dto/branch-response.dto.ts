import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BranchStatus } from '../enums/branch-status.enum';

export class BranchResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'HCM-Q1' })
  code!: string;

  @ApiProperty({ example: 'Aura Spa – Quận 1' })
  name!: string;

  @ApiProperty({ example: '123 Nguyen Hue, Quan 1, TP.HCM' })
  address!: string;

  @ApiProperty({ example: 'Ho Chi Minh City' })
  city!: string;

  @ApiPropertyOptional({ example: 'Quan 1' })
  district!: string | null;

  @ApiProperty({ example: 10.77609 })
  latitude!: number;

  @ApiProperty({ example: 106.70295 })
  longitude!: number;

  @ApiPropertyOptional({ example: '0283001001' })
  phone!: string | null;

  @ApiProperty({ enum: BranchStatus, enumName: 'BranchStatus', example: BranchStatus.Active })
  status!: BranchStatus;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}

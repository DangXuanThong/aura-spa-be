import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BranchServiceResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '1' })
  branchId!: string;

  @ApiProperty({ example: '1' })
  serviceId!: string;

  @ApiProperty({ example: true })
  isEnabled!: boolean;

  @ApiPropertyOptional({ example: 90 })
  durationMinutesOverride!: number | null;

  @ApiPropertyOptional({ example: 450000 })
  priceOverride!: number | null;

  @ApiPropertyOptional({ example: 3 })
  maxParallelBookings!: number | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}

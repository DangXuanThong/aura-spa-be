import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum TrendGranularity {
  Day = 'day',
  Week = 'week',
  Month = 'month',
  Quarter = 'quarter',
  Year = 'year',
}

export class BranchRevenueSummaryDto {
  @ApiProperty({ example: '1' })
  branchId!: string;

  @ApiProperty({ example: 'Aura Spa — Q1 HCM' })
  branchName!: string;

  @ApiProperty({ example: 48500.0 })
  totalRevenue!: number;

  @ApiProperty({ example: 35 })
  completedBookings!: number;

  @ApiProperty({ example: 6 })
  cancelledBookings!: number;

  @ApiPropertyOptional({ example: 1385.71 })
  averageBookingValue!: number | null;
}

export class RevenueTrendPointDto {
  @ApiProperty({ example: '2026-06-01T00:00:00.000Z', description: 'Start of the trend period bucket' })
  period!: string;

  @ApiProperty({ example: 12500.0 })
  revenue!: number;

  @ApiProperty({ example: 9 })
  completedBookings!: number;
}

export class RevenueDashboardDto {
  @ApiProperty({ example: '2026-05-19T00:00:00.000Z' })
  periodFrom!: Date;

  @ApiProperty({ example: '2026-06-18T23:59:59.999Z' })
  periodTo!: Date;

  @ApiProperty({ enum: TrendGranularity, enumName: 'TrendGranularity', example: TrendGranularity.Day })
  granularity!: TrendGranularity;

  @ApiProperty({ example: 125000.0 })
  totalRevenue!: number;

  @ApiProperty({
    example: 125000.0,
    description:
      // eslint-disable-next-line max-len
      'System-wide profit. Currently equal to totalRevenue as a placeholder — cost tracking (materials, staff commission, overhead) is not yet implemented.',
  })
  systemProfit!: number;

  @ApiProperty({ example: 27000.0, description: 'Material cost calculated from consumed inventory quantity multiplied by item unitCost.' })
  totalMaterialCost!: number;

  @ApiPropertyOptional({ example: 78.4, description: 'System profit margin percentage; null when revenue is zero.' })
  profitMargin!: number | null;

  @ApiProperty({ example: 120 })
  totalCompletedBookings!: number;

  @ApiProperty({ example: 18 })
  totalCancelledBookings!: number;

  @ApiPropertyOptional({ example: 1041.67, description: 'Average paidAmount per completed booking; null if none' })
  averageBookingValue!: number | null;

  @ApiProperty({ type: [BranchRevenueSummaryDto], description: 'Per-branch breakdown for comparative charts' })
  @Type(() => BranchRevenueSummaryDto)
  byBranch!: BranchRevenueSummaryDto[];

  @ApiProperty({ type: [RevenueTrendPointDto], description: 'Revenue trend grouped by granularity' })
  @Type(() => RevenueTrendPointDto)
  trend!: RevenueTrendPointDto[];
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RevenueTrendPointDto } from './revenue-dashboard.dto';

export class RevenueSummaryDto {
  @ApiProperty({ description: 'Sum of paidAmount for all completed bookings in the period', example: 12500.0 })
  totalRevenue!: number;

  @ApiProperty({ example: 48 })
  totalBookings!: number;

  @ApiProperty({ example: 35 })
  completedBookings!: number;

  @ApiProperty({ example: 6 })
  cancelledBookings!: number;

  @ApiPropertyOptional({ description: 'Average paidAmount per completed booking; null if none', example: 357.14 })
  averageBookingValue!: number | null;
}

export class StaffPerformanceDto {
  @ApiProperty({ example: '7' })
  technicianId!: string;

  @ApiProperty({ example: 'Nguyen Thi Lan' })
  technicianName!: string;

  @ApiProperty({ example: 18 })
  completedServices!: number;

  @ApiPropertyOptional({ description: 'Average rating from published reviews; null if no reviews', example: 4.7 })
  averageRating!: number | null;

  @ApiProperty({ example: 12 })
  reviewCount!: number;
}

export class BranchPerformanceReportDto {
  @ApiProperty({ example: '1' })
  branchId!: string;

  @ApiProperty({ example: '2026-05-19T00:00:00.000Z', description: 'Start of reporting period (inclusive)' })
  periodFrom!: Date;

  @ApiProperty({ example: '2026-06-18T23:59:59.999Z', description: 'End of reporting period (inclusive)' })
  periodTo!: Date;

  @ApiProperty({ type: RevenueSummaryDto })
  @Type(() => RevenueSummaryDto)
  revenue!: RevenueSummaryDto;

  @ApiProperty({ type: [StaffPerformanceDto] })
  @Type(() => StaffPerformanceDto)
  staffPerformance!: StaffPerformanceDto[];

  @ApiPropertyOptional({ type: [RevenueTrendPointDto] })
  @Type(() => RevenueTrendPointDto)
  trend?: RevenueTrendPointDto[];
}

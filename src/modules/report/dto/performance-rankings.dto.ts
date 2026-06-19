import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class TopStaffRankingItemDto {
  @ApiProperty({ example: 1 })
  rank!: number;

  @ApiProperty({ example: '7' })
  staffId!: string;

  @ApiProperty({ example: 'Nguyen Thi Lan' })
  staffName!: string;

  @ApiProperty({ example: 42, description: 'Completed bookings in the period' })
  completedServices!: number;

  @ApiPropertyOptional({ example: 4.8, description: 'Average rating from published reviews; null if none' })
  averageRating!: number | null;

  @ApiProperty({ example: 15 })
  reviewCount!: number;

  @ApiProperty({ example: 15750.0, description: 'Sum of paidAmount on completed bookings in the period' })
  revenueGenerated!: number;
}

export class TopStaffRankingsDto {
  @ApiProperty({ example: '2026-05-19T00:00:00.000Z' })
  periodFrom!: Date;

  @ApiProperty({ example: '2026-06-18T23:59:59.999Z' })
  periodTo!: Date;

  @ApiProperty({ type: [TopStaffRankingItemDto] })
  @Type(() => TopStaffRankingItemDto)
  rankings!: TopStaffRankingItemDto[];
}

export class PopularServiceRankingItemDto {
  @ApiProperty({ example: 1 })
  rank!: number;

  @ApiProperty({ example: '3' })
  serviceId!: string;

  @ApiProperty({ example: 'Deep Tissue Massage' })
  serviceName!: string;

  @ApiPropertyOptional({ example: 'Massage', description: 'Service category; null if unset' })
  category!: string | null;

  @ApiProperty({ example: 87, description: 'Number of completed bookings containing this service' })
  bookingCount!: number;

  @ApiProperty({ example: 26100.0, description: 'Sum of final_amount from booking_services for completed bookings' })
  totalRevenue!: number;
}

export class PopularServicesRankingsDto {
  @ApiProperty({ example: '2026-05-19T00:00:00.000Z' })
  periodFrom!: Date;

  @ApiProperty({ example: '2026-06-18T23:59:59.999Z' })
  periodTo!: Date;

  @ApiProperty({ type: [PopularServiceRankingItemDto] })
  @Type(() => PopularServiceRankingItemDto)
  rankings!: PopularServiceRankingItemDto[];
}

export class BranchRankingItemDto {
  @ApiProperty({ example: 1 })
  rank!: number;

  @ApiProperty({ example: '1' })
  branchId!: string;

  @ApiProperty({ example: 'Aura Spa — District 1' })
  branchName!: string;

  @ApiProperty({ example: 48250.0 })
  totalRevenue!: number;

  @ApiProperty({ example: 135 })
  completedBookings!: number;

  @ApiProperty({ example: 12 })
  cancelledBookings!: number;

  @ApiPropertyOptional({ example: 357.4, description: 'Average paidAmount per completed booking; null if none' })
  averageBookingValue!: number | null;
}

export class BranchRankingsDto {
  @ApiProperty({ example: '2026-05-19T00:00:00.000Z' })
  periodFrom!: Date;

  @ApiProperty({ example: '2026-06-18T23:59:59.999Z' })
  periodTo!: Date;

  @ApiProperty({ type: [BranchRankingItemDto] })
  @Type(() => BranchRankingItemDto)
  rankings!: BranchRankingItemDto[];
}

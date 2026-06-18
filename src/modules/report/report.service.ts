import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { Review } from 'src/modules/review/entities/review.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';
import { ReviewStatus } from 'src/modules/review/enums/review-status.enum';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { StaffPosition } from 'src/modules/branch/enums/staff-position.enum';
import { BranchPerformanceReportDto, RevenueSummaryDto, StaffPerformanceDto } from './dto/branch-performance-report.dto';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(BranchStaff)
    private readonly branchStaffRepo: Repository<BranchStaff>,
  ) {}

  // UC31 — Branch performance report
  async getBranchPerformance(branchId: string, managerId: string, from: Date, to: Date): Promise<BranchPerformanceReportDto> {
    await this.assertManagerAtBranch(managerId, branchId);

    const [revenue, staffPerformance] = await Promise.all([
      this.queryRevenueSummary(branchId, from, to),
      this.queryStaffPerformance(branchId, from, to),
    ]);

    return { branchId, periodFrom: from, periodTo: to, revenue, staffPerformance };
  }

  private async queryRevenueSummary(branchId: string, from: Date, to: Date): Promise<RevenueSummaryDto> {
    const raw =
      (await this.bookingRepo
        .createQueryBuilder('b')
        .select('COUNT(b.id)', 'totalBookings')
        .addSelect(`COUNT(CASE WHEN b.status = '${BookingStatus.Completed}' THEN 1 END)`, 'completedBookings')
        .addSelect(`COUNT(CASE WHEN b.status = '${BookingStatus.Cancelled}' THEN 1 END)`, 'cancelledBookings')
        .addSelect(`COALESCE(SUM(CASE WHEN b.status = '${BookingStatus.Completed}' THEN b.paidAmount ELSE 0 END), 0)`, 'totalRevenue')
        .addSelect(`AVG(CASE WHEN b.status = '${BookingStatus.Completed}' THEN b.paidAmount END)`, 'averageBookingValue')
        .where('b.branchId = :branchId', { branchId })
        .andWhere('b.startTime >= :from', { from })
        .andWhere('b.startTime <= :to', { to })
        .getRawOne<Record<string, string>>()) ?? ({} as Record<string, string>);

    return {
      totalBookings: parseInt(raw.totalBookings ?? '0', 10),
      completedBookings: parseInt(raw.completedBookings ?? '0', 10),
      cancelledBookings: parseInt(raw.cancelledBookings ?? '0', 10),
      totalRevenue: parseFloat(raw.totalRevenue ?? '0'),
      averageBookingValue: raw.averageBookingValue != null ? parseFloat(raw.averageBookingValue) : null,
    };
  }

  private async queryStaffPerformance(branchId: string, from: Date, to: Date): Promise<StaffPerformanceDto[]> {
    const rows = await this.branchStaffRepo
      .createQueryBuilder('bs')
      .innerJoin(User, 'u', 'u.id = bs.userId')
      .leftJoin(
        Booking,
        'b',
        'b.technicianId = bs.userId AND b.branchId = :branchId' +
          ` AND b.status = '${BookingStatus.Completed}' AND b.startTime >= :from AND b.startTime <= :to`,
      )
      .leftJoin(Review, 'r', `r.technicianId = bs.userId AND r.branchId = :branchId AND r.status = '${ReviewStatus.Published}'`)
      .select('bs.userId', 'technicianId')
      .addSelect('u.fullName', 'technicianName')
      .addSelect('COUNT(DISTINCT b.id)', 'completedServices')
      .addSelect('AVG(r.rating)', 'averageRating')
      .addSelect('COUNT(DISTINCT r.id)', 'reviewCount')
      .where('bs.branchId = :branchId', { branchId })
      .andWhere('bs.status = :active', { active: StaffStatus.Active })
      .andWhere('bs.position = :position', { position: StaffPosition.Technician })
      .setParameters({ branchId, from, to })
      .groupBy('bs.userId')
      .addGroupBy('u.fullName')
      .orderBy('COUNT(DISTINCT b.id)', 'DESC')
      .getRawMany<Record<string, string>>();

    return rows.map((r) => ({
      technicianId: r.technicianId,
      technicianName: r.technicianName,
      completedServices: parseInt(r.completedServices, 10),
      averageRating: r.averageRating != null ? Math.round(parseFloat(r.averageRating) * 10) / 10 : null,
      reviewCount: parseInt(r.reviewCount, 10),
    }));
  }

  private async assertManagerAtBranch(managerId: string, branchId: string): Promise<void> {
    const assignment = await this.branchStaffRepo.findOne({
      where: { userId: managerId, branchId, status: StaffStatus.Active },
    });
    if (!assignment) throw new ForbiddenException('You are not an active manager at this branch');
  }
}

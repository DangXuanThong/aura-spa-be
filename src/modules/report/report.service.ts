import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BookingService as BookingServiceEntity } from 'src/modules/booking/entities/booking-service.entity';
import { Review } from 'src/modules/review/entities/review.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { Payment } from 'src/modules/payment/entities/payment.entity';
import { PaymentStatus } from 'src/modules/payment/enums/payment-status.enum';
import { User } from 'src/modules/user/entities/user.entity';
import { Service as ServiceEntity } from 'src/modules/service/entities/service.entity';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';
import { ReviewStatus } from 'src/modules/review/enums/review-status.enum';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { StaffPosition } from 'src/modules/branch/enums/staff-position.enum';
import { BranchPerformanceReportDto, RevenueSummaryDto, StaffPerformanceDto } from './dto/branch-performance-report.dto';
import { BranchRevenueSummaryDto, RevenueDashboardDto, RevenueTrendPointDto, TrendGranularity } from './dto/revenue-dashboard.dto';
import {
  BranchRankingItemDto,
  BranchRankingsDto,
  PopularServiceRankingItemDto,
  PopularServicesRankingsDto,
  TopStaffRankingItemDto,
  TopStaffRankingsDto,
} from './dto/performance-rankings.dto';

@Injectable()
export class ReportService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(BranchStaff)
    private readonly branchStaffRepo: Repository<BranchStaff>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  // UC31 — Branch performance report
  async getBranchPerformance(branchId: string, managerId: string, userRole: string, from: Date, to: Date): Promise<BranchPerformanceReportDto> {
    if (userRole !== 'owner') {
      await this.assertManagerAtBranch(managerId, branchId);
    }

    const [revenue, staffPerformance, trend] = await Promise.all([
      this.queryRevenueSummary(branchId, from, to),
      this.queryStaffPerformance(branchId, from, to),
      this.queryBranchTrend(branchId, from, to, 'month' as any),
    ]);

    return { branchId, periodFrom: from, periodTo: to, revenue, staffPerformance, trend };
  }

  private async queryRevenueSummary(branchId: string, from: Date, to: Date): Promise<RevenueSummaryDto> {
    const raw =
      (await this.bookingRepo
        .createQueryBuilder('b')
        .select('COUNT(b.id)', 'totalBookings')
        .addSelect(`COUNT(CASE WHEN b.status = '${BookingStatus.Completed}' THEN 1 END)`, 'completedBookings')
        .addSelect(`COUNT(CASE WHEN b.status = '${BookingStatus.Cancelled}' THEN 1 END)`, 'cancelledBookings')
        .where('b.branchId = :branchId', { branchId })
        .andWhere('b.startTime >= :from', { from })
        .andWhere('b.startTime <= :to', { to })
        .getRawOne<Record<string, string>>()) ?? ({} as Record<string, string>);

    const totalRevenue = await this.queryNetPaymentRevenue({ branchId, from, to });
    const completedBookings = parseInt(raw.completedBookings ?? '0', 10);

    return {
      totalBookings: parseInt(raw.totalBookings ?? '0', 10),
      completedBookings,
      cancelledBookings: parseInt(raw.cancelledBookings ?? '0', 10),
      totalRevenue,
      averageBookingValue: completedBookings > 0 ? Math.round((totalRevenue / completedBookings) * 100) / 100 : null,
    };
  }

  private async queryNetPaymentRevenue(params: { branchId?: string; from: Date; to: Date }): Promise<number> {
    const query = this.paymentRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount - p.refunded_amount), 0)', 'revenue')
      .where('p.status IN (:...statuses)', {
        statuses: [PaymentStatus.Paid, PaymentStatus.PartiallyRefunded],
      })
      .andWhere('p.paid_at >= :from', { from: params.from })
      .andWhere('p.paid_at <= :to', { to: params.to });

    if (params.branchId) {
      query.andWhere('p.branch_id = :branchId', { branchId: params.branchId });
    }

    const raw = await query.getRawOne<{ revenue: string }>();
    return Math.round(parseFloat(raw?.revenue ?? '0') * 100) / 100;
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

  private async queryBranchTrend(branchId: string, from: Date, to: Date, granularity: TrendGranularity): Promise<RevenueTrendPointDto[]> {
    const rows = await this.bookingRepo
      .createQueryBuilder('b')
      .select(`DATE_TRUNC('${granularity}', b.startTime)`, 'period')
      .addSelect(`COALESCE(SUM(CASE WHEN b.status = '${BookingStatus.Completed}' THEN b.paidAmount ELSE 0 END), 0)`, 'revenue')
      .addSelect(`COUNT(CASE WHEN b.status = '${BookingStatus.Completed}' THEN 1 END)`, 'completedBookings')
      .where('b.branchId = :branchId', { branchId })
      .andWhere('b.startTime >= :from', { from })
      .andWhere('b.startTime <= :to', { to })
      .groupBy(`DATE_TRUNC('${granularity}', b.startTime)`)
      .orderBy(`DATE_TRUNC('${granularity}', b.startTime)`, 'ASC')
      .getRawMany<Record<string, string>>();

    return rows.map((r) => ({
      period: new Date(r.period).toISOString(),
      revenue: parseFloat(r.revenue ?? '0'),
      completedBookings: parseInt(r.completedBookings ?? '0', 10),
    }));
  }

  // UC36 — Owner: cross-branch revenue dashboard
  async getRevenueDashboard(from: Date, to: Date, granularity: TrendGranularity): Promise<RevenueDashboardDto> {
    const [byBranch, trend] = await Promise.all([this.queryByBranch(from, to), this.queryTrend(from, to, granularity)]);

    const totalRevenue = byBranch.reduce((s, b) => s + b.totalRevenue, 0);
    const totalCompletedBookings = byBranch.reduce((s, b) => s + b.completedBookings, 0);
    const totalCancelledBookings = byBranch.reduce((s, b) => s + b.cancelledBookings, 0);
    const averageBookingValue = totalCompletedBookings > 0 ? totalRevenue / totalCompletedBookings : null;

    return {
      periodFrom: from,
      periodTo: to,
      granularity,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalCompletedBookings,
      totalCancelledBookings,
      averageBookingValue: averageBookingValue != null ? Math.round(averageBookingValue * 100) / 100 : null,
      byBranch,
      trend,
    };
  }

  private async queryByBranch(from: Date, to: Date): Promise<BranchRevenueSummaryDto[]> {
    const rows = (await this.bookingRepo.query(
      `
        WITH payment_stats AS (
          SELECT
            branch_id,
            COALESCE(SUM(amount - refunded_amount), 0) AS total_revenue
          FROM payments
          WHERE status IN ($3, $4)
            AND paid_at >= $1
            AND paid_at <= $2
          GROUP BY branch_id
        ),
        booking_stats AS (
          SELECT
            branch_id,
            COUNT(CASE WHEN status = $5 THEN 1 END) AS completed_bookings,
            COUNT(CASE WHEN status = $6 THEN 1 END) AS cancelled_bookings
          FROM bookings
          WHERE start_time >= $1
            AND start_time <= $2
          GROUP BY branch_id
        )
        SELECT
          br.id AS "branchId",
          br.name AS "branchName",
          COALESCE(ps.total_revenue, 0) AS "totalRevenue",
          COALESCE(bs.completed_bookings, 0) AS "completedBookings",
          COALESCE(bs.cancelled_bookings, 0) AS "cancelledBookings",
          CASE
            WHEN COALESCE(bs.completed_bookings, 0) > 0
            THEN COALESCE(ps.total_revenue, 0) / bs.completed_bookings
            ELSE NULL
          END AS "averageBookingValue"
        FROM branches br
        LEFT JOIN payment_stats ps ON ps.branch_id = br.id
        LEFT JOIN booking_stats bs ON bs.branch_id = br.id
        WHERE ps.branch_id IS NOT NULL OR bs.branch_id IS NOT NULL
        ORDER BY COALESCE(ps.total_revenue, 0) DESC
      `,
      [
        from,
        to,
        PaymentStatus.Paid,
        PaymentStatus.PartiallyRefunded,
        BookingStatus.Completed,
        BookingStatus.Cancelled,
      ],
    )) as Record<string, string>[];

    return rows.map((r) => ({
      branchId: r.branchId,
      branchName: r.branchName,
      totalRevenue: parseFloat(r.totalRevenue ?? '0'),
      completedBookings: parseInt(r.completedBookings ?? '0', 10),
      cancelledBookings: parseInt(r.cancelledBookings ?? '0', 10),
      averageBookingValue: r.averageBookingValue != null ? Math.round(parseFloat(r.averageBookingValue) * 100) / 100 : null,
    }));
  }

  private async queryTrend(from: Date, to: Date, granularity: TrendGranularity): Promise<RevenueTrendPointDto[]> {
    const rows = (await this.bookingRepo.query(
      `
        WITH payment_trend AS (
          SELECT
            DATE_TRUNC('${granularity}', paid_at) AS period,
            COALESCE(SUM(amount - refunded_amount), 0) AS revenue
          FROM payments
          WHERE status IN ($3, $4)
            AND paid_at >= $1
            AND paid_at <= $2
          GROUP BY DATE_TRUNC('${granularity}', paid_at)
        ),
        booking_trend AS (
          SELECT
            DATE_TRUNC('${granularity}', start_time) AS period,
            COUNT(*) AS completed_bookings
          FROM bookings
          WHERE status = $5
            AND start_time >= $1
            AND start_time <= $2
          GROUP BY DATE_TRUNC('${granularity}', start_time)
        )
        SELECT
          COALESCE(pt.period, bt.period) AS period,
          COALESCE(pt.revenue, 0) AS revenue,
          COALESCE(bt.completed_bookings, 0) AS "completedBookings"
        FROM payment_trend pt
        FULL OUTER JOIN booking_trend bt ON bt.period = pt.period
        ORDER BY COALESCE(pt.period, bt.period) ASC
      `,
      [from, to, PaymentStatus.Paid, PaymentStatus.PartiallyRefunded, BookingStatus.Completed],
    )) as Record<string, string>[];

    return rows.map((r) => ({
      period: new Date(r.period).toISOString(),
      revenue: parseFloat(r.revenue ?? '0'),
      completedBookings: parseInt(r.completedBookings ?? '0', 10),
    }));
  }

  private async assertManagerAtBranch(managerId: string, branchId: string): Promise<void> {
    const assignment = await this.branchStaffRepo.findOne({
      where: { userId: managerId, branchId, status: StaffStatus.Active },
    });
    if (!assignment) throw new ForbiddenException('You are not an active manager at this branch');
  }

  // UC37 — Owner: performance rankings

  async getTopStaffRankings(from: Date, to: Date, limit: number): Promise<TopStaffRankingsDto> {
    const bookingRows = await this.bookingRepo
      .createQueryBuilder('b')
      .innerJoin(User, 'u', 'u.id = b.technicianId')
      .leftJoin(
        Payment,
        'p',
        'p.booking_id = b.id AND p.status IN (:...paymentStatuses) AND p.paid_at >= :from AND p.paid_at <= :to',
      )
      .select('b.technicianId', 'staffId')
      .addSelect('u.fullName', 'staffName')
      .addSelect('COUNT(b.id)', 'completedServices')
      .addSelect('COALESCE(SUM(p.amount - p.refunded_amount), 0)', 'revenueGenerated')
      .where('b.status = :status', { status: BookingStatus.Completed })
      .andWhere('b.startTime >= :from', { from })
      .andWhere('b.startTime <= :to', { to })
      .andWhere('b.technicianId IS NOT NULL')
      .setParameter('paymentStatuses', [PaymentStatus.Paid, PaymentStatus.PartiallyRefunded])
      .groupBy('b.technicianId')
      .addGroupBy('u.fullName')
      .orderBy('COUNT(b.id)', 'DESC')
      .limit(limit)
      .getRawMany<Record<string, string>>();

    let reviewMap = new Map<string, Record<string, string>>();
    if (bookingRows.length > 0) {
      const ids = bookingRows.map((r) => r.staffId);
      const reviewRows = await this.reviewRepo
        .createQueryBuilder('r')
        .select('r.technicianId', 'technicianId')
        .addSelect('AVG(r.rating)', 'averageRating')
        .addSelect('COUNT(r.id)', 'reviewCount')
        .where('r.technicianId IN (:...ids)', { ids })
        .andWhere('r.status = :status', { status: ReviewStatus.Published })
        .groupBy('r.technicianId')
        .getRawMany<Record<string, string>>();
      reviewMap = new Map(reviewRows.map((r) => [r.technicianId, r]));
    }

    const rankings: TopStaffRankingItemDto[] = bookingRows.map((r, i) => {
      const rv = reviewMap.get(r.staffId);
      return {
        rank: i + 1,
        staffId: r.staffId,
        staffName: r.staffName,
        completedServices: parseInt(r.completedServices, 10),
        revenueGenerated: Math.round(parseFloat(r.revenueGenerated ?? '0') * 100) / 100,
        averageRating: rv?.averageRating != null ? Math.round(parseFloat(rv.averageRating) * 10) / 10 : null,
        reviewCount: rv ? parseInt(rv.reviewCount, 10) : 0,
      };
    });

    return { periodFrom: from, periodTo: to, rankings };
  }

  async getPopularServicesRankings(from: Date, to: Date, limit: number): Promise<PopularServicesRankingsDto> {
    const rows = await this.bookingRepo
      .createQueryBuilder('b')
      .innerJoin(BookingServiceEntity, 'bs', 'bs.bookingId = b.id')
      .innerJoin(ServiceEntity, 'svc', 'svc.id = bs.serviceId')
      .select('bs.serviceId', 'serviceId')
      .addSelect('svc.name', 'serviceName')
      .addSelect('svc.category', 'category')
      .addSelect('COUNT(DISTINCT b.id)', 'bookingCount')
      .addSelect('COALESCE(SUM(bs.finalAmount), 0)', 'totalRevenue')
      .where('b.status = :status', { status: BookingStatus.Completed })
      .andWhere('b.startTime >= :from', { from })
      .andWhere('b.startTime <= :to', { to })
      .groupBy('bs.serviceId')
      .addGroupBy('svc.name')
      .addGroupBy('svc.category')
      .orderBy('COUNT(DISTINCT b.id)', 'DESC')
      .limit(limit)
      .getRawMany<Record<string, string>>();

    const rankings: PopularServiceRankingItemDto[] = rows.map((r, i) => ({
      rank: i + 1,
      serviceId: r.serviceId,
      serviceName: r.serviceName,
      category: r.category ?? null,
      bookingCount: parseInt(r.bookingCount, 10),
      totalRevenue: Math.round(parseFloat(r.totalRevenue ?? '0') * 100) / 100,
    }));

    return { periodFrom: from, periodTo: to, rankings };
  }

  async getBranchRankings(from: Date, to: Date, limit: number): Promise<BranchRankingsDto> {
    const rows = (await this.bookingRepo.query(
      `
        WITH payment_stats AS (
          SELECT
            branch_id,
            COALESCE(SUM(amount - refunded_amount), 0) AS total_revenue
          FROM payments
          WHERE status IN ($3, $4)
            AND paid_at >= $1
            AND paid_at <= $2
          GROUP BY branch_id
        ),
        booking_stats AS (
          SELECT
            branch_id,
            COUNT(CASE WHEN status = $5 THEN 1 END) AS completed_bookings,
            COUNT(CASE WHEN status = $6 THEN 1 END) AS cancelled_bookings
          FROM bookings
          WHERE start_time >= $1
            AND start_time <= $2
          GROUP BY branch_id
        )
        SELECT
          br.id AS "branchId",
          br.name AS "branchName",
          COALESCE(ps.total_revenue, 0) AS "totalRevenue",
          COALESCE(bs.completed_bookings, 0) AS "completedBookings",
          COALESCE(bs.cancelled_bookings, 0) AS "cancelledBookings",
          CASE
            WHEN COALESCE(bs.completed_bookings, 0) > 0
            THEN COALESCE(ps.total_revenue, 0) / bs.completed_bookings
            ELSE NULL
          END AS "averageBookingValue"
        FROM branches br
        LEFT JOIN payment_stats ps ON ps.branch_id = br.id
        LEFT JOIN booking_stats bs ON bs.branch_id = br.id
        WHERE ps.branch_id IS NOT NULL OR bs.branch_id IS NOT NULL
        ORDER BY COALESCE(ps.total_revenue, 0) DESC
        LIMIT $7
      `,
      [
        from,
        to,
        PaymentStatus.Paid,
        PaymentStatus.PartiallyRefunded,
        BookingStatus.Completed,
        BookingStatus.Cancelled,
        limit,
      ],
    )) as Record<string, string>[];

    const rankings: BranchRankingItemDto[] = rows.map((r, i) => ({
      rank: i + 1,
      branchId: r.branchId,
      branchName: r.branchName,
      totalRevenue: Math.round(parseFloat(r.totalRevenue ?? '0') * 100) / 100,
      completedBookings: parseInt(r.completedBookings ?? '0', 10),
      cancelledBookings: parseInt(r.cancelledBookings ?? '0', 10),
      averageBookingValue: r.averageBookingValue != null ? Math.round(parseFloat(r.averageBookingValue) * 100) / 100 : null,
    }));

    return { periodFrom: from, periodTo: to, rankings };
  }

  async getManagerDashboard(branchId: string, managerId: string, role: string): Promise<any> {
    if (role !== 'owner') {
      await this.assertManagerAtBranch(managerId, branchId);
    }

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    // 1. Today's net collected revenue (SePay deposits + counter payments, minus refunds)
    const todayRevenue = await this.queryNetPaymentRevenue({
      branchId,
      from: startOfToday,
      to: endOfToday,
    });

    // 2. Today's Bookings Count
    const todayBookingsCount = await this.bookingRepo
      .createQueryBuilder('b')
      .where('b.branchId = :branchId', { branchId })
      .andWhere('b.startTime >= :startOfToday', { startOfToday })
      .andWhere('b.startTime <= :endOfToday', { endOfToday })
      .getCount();

    // 2.1 Today's Completed Bookings Count
    const completedBookingsCount = await this.bookingRepo
      .createQueryBuilder('b')
      .where('b.branchId = :branchId', { branchId })
      .andWhere('b.status = :completed', { completed: BookingStatus.Completed })
      .andWhere('b.startTime >= :startOfToday', { startOfToday })
      .andWhere('b.startTime <= :endOfToday', { endOfToday })
      .getCount();

    // 3. Active Staff Count (currently on shift)
    const now = new Date();
    const activeStaffCountRaw = await this.bookingRepo.query(
      `SELECT COUNT(id) AS "count"
       FROM staff_schedules
       WHERE branch_id = $1 AND schedule_type = 'working' AND status = 'active'
         AND start_time <= $2 AND end_time >= $2`,
      [branchId, now]
    );
    const activeStaffCount = parseInt(activeStaffCountRaw?.[0]?.count || '0', 10);

    // 4. Open Complaints Count (open or in_progress status)
    const openComplaintsCountRaw = await this.bookingRepo.query(
      `SELECT COUNT(id) AS "count"
       FROM complaints
       WHERE branch_id = $1 AND status IN ('open', 'in_progress')`,
      [branchId]
    );
    const openComplaintsCount = parseInt(openComplaintsCountRaw?.[0]?.count || '0', 10);

    return {
      todayRevenue,
      todayBookingsCount,
      completedBookingsCount,
      activeStaffCount,
      openComplaintsCount,
    };
  }
}

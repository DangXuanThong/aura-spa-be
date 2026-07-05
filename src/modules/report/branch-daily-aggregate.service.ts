import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BranchDailyAggregate } from './entities/branch-daily-aggregate.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';
import { PaymentStatus } from 'src/modules/payment/enums/payment-status.enum';

@Injectable()
export class BranchDailyAggregateService {
  private readonly logger = new Logger(BranchDailyAggregateService.name);

  constructor(
    @InjectRepository(BranchDailyAggregate)
    private readonly aggregateRepo: Repository<BranchDailyAggregate>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    private readonly dataSource: DataSource,
  ) {}

  // Runs daily at 00:05 to aggregate previous day's data
  @Cron('5 0 * * *')
  async runDailyAggregation(): Promise<void> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    await this.aggregateForDate(dateStr);
  }

  async aggregateForDate(dateStr: string): Promise<void> {
    this.logger.log(`Aggregating branch data for ${dateStr}`);
    const branches = await this.branchRepo.find({ select: ['id'] });

    for (const branch of branches) {
      try {
        await this.aggregateBranchDate(branch.id, dateStr);
      } catch (err) {
        this.logger.error(`Failed to aggregate branch ${branch.id} for ${dateStr}: ${err}`);
      }
    }
  }

  private async aggregateBranchDate(branchId: string, dateStr: string): Promise<void> {
    const nextDate = new Date(dateStr);
    nextDate.setDate(nextDate.getDate() + 1);
    const nextDateStr = nextDate.toISOString().split('T')[0];

    const [bookingStats] = await this.dataSource.query<
      { total: string; completed: string; cancelled: string; no_show: string; avg_minutes: string }[]
    >(
      `SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE status = $1)::int AS completed,
        COUNT(*) FILTER (WHERE status = $2)::int AS cancelled,
        COUNT(*) FILTER (WHERE status = $3)::int AS no_show,
        COALESCE(AVG(EXTRACT(EPOCH FROM (end_time - start_time)) / 60), 0)::int AS avg_minutes
       FROM bookings
       WHERE branch_id = $4
         AND start_time >= $5
         AND start_time < $6`,
      [BookingStatus.Completed, BookingStatus.Cancelled, BookingStatus.NoShow, branchId, dateStr, nextDateStr],
    );

    const [revenueStats] = await this.dataSource.query<{ revenue: string }[]>(
      `SELECT COALESCE(SUM(amount - refunded_amount), 0) AS revenue
       FROM payments
       WHERE branch_id = $1
         AND status IN ($2, $3)
         AND paid_at >= $4
         AND paid_at < $5`,
      [branchId, PaymentStatus.Paid, PaymentStatus.PartiallyRefunded, dateStr, nextDateStr],
    );

    const [newCustomerStats] = await this.dataSource.query<{ count: string }[]>(
      `SELECT COUNT(DISTINCT customer_id)::int AS count
       FROM bookings
       WHERE branch_id = $1
         AND created_at >= $2
         AND created_at < $3
         AND customer_id NOT IN (
           SELECT DISTINCT customer_id FROM bookings
           WHERE branch_id = $1 AND created_at < $2
         )`,
      [branchId, dateStr, nextDateStr],
    );

    const existing = await this.aggregateRepo.findOne({
      where: { branchId, aggregateDate: dateStr },
    });

    const data = {
      branchId,
      aggregateDate: dateStr,
      totalBookings: Number(bookingStats?.total ?? 0),
      completedBookings: Number(bookingStats?.completed ?? 0),
      cancelledBookings: Number(bookingStats?.cancelled ?? 0),
      noShowBookings: Number(bookingStats?.no_show ?? 0),
      totalRevenue: Number(revenueStats?.revenue ?? 0),
      avgServiceDurationMinutes: Number(bookingStats?.avg_minutes ?? 0),
      newCustomers: Number(newCustomerStats?.count ?? 0),
    };

    if (existing) {
      await this.aggregateRepo.update(existing.id, data);
    } else {
      await this.aggregateRepo.save(this.aggregateRepo.create(data));
    }
  }

  findByBranch(branchId: string, limit = 30): Promise<BranchDailyAggregate[]> {
    return this.aggregateRepo.find({
      where: { branchId },
      order: { aggregateDate: 'DESC' },
      take: limit,
    });
  }

  findAll(limit = 90): Promise<BranchDailyAggregate[]> {
    return this.aggregateRepo.find({
      order: { aggregateDate: 'DESC', branchId: 'ASC' },
      take: limit,
    });
  }
}

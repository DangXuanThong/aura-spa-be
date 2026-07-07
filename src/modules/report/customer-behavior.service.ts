import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

export interface CustomerBehaviorRow {
  customer_id: string;
  total_bookings: number;
  completed_bookings: number;
  cancelled_bookings: number;
  no_show_bookings: number;
  total_spent: number;
  avg_order_value: number;
  unique_branches_visited: number;
  first_booking_at: string | null;
  last_booking_at: string | null;
  avg_days_between_bookings: number;
  completion_rate_pct: number;
}

@Injectable()
export class CustomerBehaviorService {
  private readonly logger = new Logger(CustomerBehaviorService.name);

  constructor(private readonly dataSource: DataSource) {}

  // Refresh every hour — materialized view stays near-real-time
  @Cron('0 * * * *')
  async refreshView(): Promise<void> {
    this.logger.log('Refreshing mv_customer_behavior');
    try {
      await this.dataSource.query('REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_behavior;');
    } catch (err) {
      this.logger.error('Failed to refresh mv_customer_behavior', err instanceof Error ? err.message : String(err));
    }
  }

  findAll(limit = 100): Promise<CustomerBehaviorRow[]> {
    return this.dataSource.query(
      `SELECT * FROM mv_customer_behavior ORDER BY total_spent DESC LIMIT $1`,
      [limit],
    );
  }

  findOne(customerId: string): Promise<CustomerBehaviorRow[]> {
    return this.dataSource.query(
      `SELECT * FROM mv_customer_behavior WHERE customer_id = $1`,
      [customerId],
    );
  }

  findTopSpenders(limit = 20): Promise<CustomerBehaviorRow[]> {
    return this.dataSource.query(
      `SELECT * FROM mv_customer_behavior ORDER BY total_spent DESC LIMIT $1`,
      [limit],
    );
  }

  findAtRisk(minBookings = 3, maxDaysSinceLastBooking = 90): Promise<CustomerBehaviorRow[]> {
    return this.dataSource.query(
      `SELECT * FROM mv_customer_behavior
       WHERE total_bookings >= $1
         AND last_booking_at < NOW() - ($2 || ' days')::interval
         AND completion_rate_pct >= 60
       ORDER BY last_booking_at ASC
       LIMIT 50`,
      [minBookings, maxDaysSinceLastBooking],
    );
  }
}

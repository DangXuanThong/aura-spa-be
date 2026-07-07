import { Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('branch_daily_aggregates')
@Index('IDX_bda_branch_date', ['branchId', 'aggregateDate'], { unique: true })
@Index('IDX_bda_date', ['aggregateDate'])
export class BranchDailyAggregate {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'branch_id', type: 'bigint', nullable: false })
  branchId!: string;

  @Column({ name: 'aggregate_date', type: 'date', nullable: false })
  aggregateDate!: string;

  @Column({ name: 'total_bookings', type: 'int', default: 0 })
  totalBookings!: number;

  @Column({ name: 'completed_bookings', type: 'int', default: 0 })
  completedBookings!: number;

  @Column({ name: 'cancelled_bookings', type: 'int', default: 0 })
  cancelledBookings!: number;

  @Column({ name: 'no_show_bookings', type: 'int', default: 0 })
  noShowBookings!: number;

  @Column({ name: 'total_revenue', type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalRevenue!: number;

  @Column({ name: 'avg_service_duration_minutes', type: 'int', default: 0 })
  avgServiceDurationMinutes!: number;

  @Column({ name: 'new_customers', type: 'int', default: 0 })
  newCustomers!: number;

  @UpdateDateColumn({ name: 'computed_at', type: 'timestamptz' })
  computedAt!: Date;
}

import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { DiscountCode } from 'src/modules/promotion/entities/discount-code.entity';
import { BookingStatus } from '../enums/booking-status.enum';
import { BookingSource } from '../enums/booking-source.enum';

@Entity('bookings')
@Index('IDX_bookings_customer_id', ['customerId'])
@Index('IDX_bookings_branch_id', ['branchId'])
@Index('IDX_bookings_technician_id', ['technicianId'])
@Index('IDX_bookings_status', ['status'])
@Index('IDX_bookings_branch_time', ['branchId', 'startTime', 'endTime'])
@Index('IDX_bookings_technician_time', ['technicianId', 'startTime', 'endTime'])
@Index('IDX_bookings_customer_time', ['customerId', 'startTime'])
@Index('IDX_bookings_branch_status_time', ['branchId', 'status', 'startTime'])
export class Booking {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'customer_id', type: 'bigint', nullable: false })
  customerId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer?: User;

  @Column({ name: 'branch_id', type: 'bigint', nullable: false })
  branchId!: string;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @Column({ name: 'technician_id', type: 'bigint', nullable: true })
  technicianId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'technician_id' })
  technician?: User;

  @Column({ name: 'discount_code_id', type: 'bigint', nullable: true })
  discountCodeId!: string | null;

  @ManyToOne(() => DiscountCode, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'discount_code_id' })
  discountCode?: DiscountCode;

  @Column({ name: 'start_time', type: 'timestamptz', nullable: false })
  startTime!: Date;

  @Column({ name: 'end_time', type: 'timestamptz', nullable: false })
  endTime!: Date;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    enumName: 'booking_status',
    default: BookingStatus.PendingPayment,
    nullable: false,
  })
  status!: BookingStatus;

  @Column({
    type: 'enum',
    enum: BookingSource,
    enumName: 'booking_source',
    default: BookingSource.Online,
    nullable: false,
  })
  source!: BookingSource;

  @Column({ name: 'subtotal_amount', type: 'decimal', precision: 10, scale: 2, default: 0, nullable: false })
  subtotalAmount!: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 2, default: 0, nullable: false })
  discountAmount!: number;

  @Column({ name: 'deposit_required_amount', type: 'decimal', precision: 10, scale: 2, default: 0, nullable: false })
  depositRequiredAmount!: number;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 10, scale: 2, default: 0, nullable: false })
  paidAmount!: number;

  @Column({ name: 'remaining_amount', type: 'decimal', precision: 10, scale: 2, default: 0, nullable: false })
  remainingAmount!: number;

  @Column({ type: 'varchar', length: 100, nullable: true })
  room!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true })
  cancelReason!: string | null;

  @Column({ name: 'transferred_from_branch_id', type: 'bigint', nullable: true })
  transferredFromBranchId!: string | null;

  @ManyToOne(() => Branch, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'transferred_from_branch_id' })
  transferredFromBranch?: Branch;

  @Column({ name: 'rescheduled_from_booking_id', type: 'bigint', nullable: true })
  rescheduledFromBookingId!: string | null;

  @ManyToOne(() => Booking, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'rescheduled_from_booking_id' })
  rescheduledFromBooking?: Booking;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser?: User;

  @Column({ name: 'checked_in_at', type: 'timestamptz', nullable: true })
  checkedInAt!: Date | null;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'cancelled_at', type: 'timestamptz', nullable: true })
  cancelledAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

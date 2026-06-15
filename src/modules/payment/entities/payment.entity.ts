import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { Invoice } from './invoice.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { PaymentType } from '../enums/payment-type.enum';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentStatus } from '../enums/payment-status.enum';

@Entity('payments')
@Index('IDX_payments_invoice_id', ['invoiceId'])
@Index('IDX_payments_booking_id', ['bookingId'])
@Index('IDX_payments_customer_id', ['customerId'])
@Index('IDX_payments_branch_id', ['branchId'])
@Index('IDX_payments_status', ['status'])
@Index('IDX_payments_branch_paid', ['branchId', 'paidAt'])
@Index('IDX_payments_customer_created', ['customerId', 'createdAt'])
export class Payment {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'invoice_id', type: 'bigint', nullable: true })
  invoiceId!: string | null;

  @ManyToOne(() => Invoice, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'invoice_id' })
  invoice?: Invoice;

  @Column({ name: 'booking_id', type: 'bigint', nullable: true })
  bookingId!: string | null;

  @ManyToOne(() => Booking, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking?: Booking;

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

  @Column({
    name: 'payment_type',
    type: 'enum',
    enum: PaymentType,
    enumName: 'payment_type',
    nullable: false,
  })
  paymentType!: PaymentType;

  @Column({
    name: 'payment_method',
    type: 'enum',
    enum: PaymentMethod,
    enumName: 'payment_method',
    nullable: false,
  })
  paymentMethod!: PaymentMethod;

  @Column({
    type: 'enum',
    enum: PaymentStatus,
    enumName: 'payment_status',
    default: PaymentStatus.Pending,
    nullable: false,
  })
  status!: PaymentStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  amount!: number;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'received_by', type: 'bigint', nullable: true })
  receivedBy!: string | null;

  @Column({ name: 'refunded_amount', type: 'decimal', precision: 10, scale: 2, default: 0, nullable: false })
  refundedAmount!: number;

  @Column({ name: 'refund_reason', type: 'text', nullable: true })
  refundReason!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

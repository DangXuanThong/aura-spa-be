import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { InvoiceStatus } from '../enums/invoice-status.enum';

@Entity('invoices')
@Index('IDX_invoices_number_unique', ['invoiceNumber'], { unique: true })
@Index('IDX_invoices_booking_id', ['bookingId'])
@Index('IDX_invoices_customer_id', ['customerId'])
@Index('IDX_invoices_branch_id', ['branchId'])
@Index('IDX_invoices_status', ['status'])
@Index('IDX_invoices_branch_issued', ['branchId', 'issuedAt'])
@Index('IDX_invoices_customer_created', ['customerId', 'createdAt'])
export class Invoice {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'invoice_number', type: 'varchar', length: 100, nullable: false })
  invoiceNumber!: string;

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
    type: 'enum',
    enum: InvoiceStatus,
    enumName: 'invoice_status',
    default: InvoiceStatus.Draft,
    nullable: false,
  })
  status!: InvoiceStatus;

  @Column({ name: 'subtotal_amount', type: 'decimal', precision: 10, scale: 2, nullable: false })
  subtotalAmount!: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 2, default: 0, nullable: false })
  discountAmount!: number;

  @Column({ name: 'tax_amount', type: 'decimal', precision: 10, scale: 2, default: 0, nullable: false })
  taxAmount!: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2, nullable: false })
  totalAmount!: number;

  @Column({ name: 'paid_amount', type: 'decimal', precision: 10, scale: 2, default: 0, nullable: false })
  paidAmount!: number;

  @Column({ name: 'remaining_amount', type: 'decimal', precision: 10, scale: 2, default: 0, nullable: false })
  remainingAmount!: number;

  @Column({ name: 'issued_at', type: 'timestamptz', nullable: true })
  issuedAt!: Date | null;

  @Column({ name: 'voided_at', type: 'timestamptz', nullable: true })
  voidedAt!: Date | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: false })
  createdBy!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT', nullable: false })
  @JoinColumn({ name: 'created_by' })
  createdByUser?: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

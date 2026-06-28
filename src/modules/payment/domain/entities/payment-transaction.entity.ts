import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { PaymentProvider } from '../enums/payment-provider.enum';
import { PaymentTransactionType } from '../enums/payment-transaction-type.enum';
import { PaymentTransactionStatus } from '../enums/payment-transaction-status.enum';

@Entity('payment_transactions')
@Index('IDX_payment_tx_reference_code', ['referenceCode'])
@Index('IDX_payment_tx_status_expires', ['status', 'expiresAt'])
@Index('IDX_payment_tx_booking_id', ['bookingId'])
export class PaymentTransaction {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'booking_id', type: 'bigint', nullable: false })
  bookingId!: string;

  @ManyToOne(() => Booking, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking?: Booking;

  @Column({ name: 'branch_id', type: 'bigint', nullable: false })
  branchId!: string;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @Column({ name: 'customer_id', type: 'bigint', nullable: false })
  customerId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer?: User;

  @Column({
    type: 'enum',
    enum: PaymentProvider,
    enumName: 'payment_provider',
    default: PaymentProvider.SePay,
    nullable: false,
  })
  provider!: PaymentProvider;

  @Column({
    name: 'transaction_type',
    type: 'enum',
    enum: PaymentTransactionType,
    enumName: 'payment_transaction_type',
    default: PaymentTransactionType.Deposit,
    nullable: false,
  })
  transactionType!: PaymentTransactionType;

  @Column({
    type: 'enum',
    enum: PaymentTransactionStatus,
    enumName: 'payment_transaction_status',
    default: PaymentTransactionStatus.Pending,
    nullable: false,
  })
  status!: PaymentTransactionStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  amount!: number;

  @Column({ type: 'varchar', length: 3, default: 'VND', nullable: false })
  currency!: string;

  @Column({ name: 'reference_code', type: 'varchar', length: 50, nullable: false })
  referenceCode!: string;

  @Column({ name: 'sepay_transaction_id', type: 'bigint', nullable: true, unique: true })
  sepayTransactionId!: string | null;

  @Column({ name: 'bank_reference_code', type: 'varchar', length: 100, nullable: true })
  bankReferenceCode!: string | null;

  @Column({ name: 'transfer_content', type: 'text', nullable: true })
  transferContent!: string | null;

  @Column({ name: 'raw_webhook_payload', type: 'jsonb', nullable: true })
  rawWebhookPayload!: Record<string, unknown> | null;

  @Column({ name: 'qr_image_url', type: 'text', nullable: true })
  qrImageUrl!: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: false })
  expiresAt!: Date;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

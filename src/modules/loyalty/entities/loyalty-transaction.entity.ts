import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { Payment } from 'src/modules/payment/entities/payment.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { LoyaltyTransactionType } from '../enums/loyalty-transaction-type.enum';
import { LoyaltyAccount } from './loyalty-account.entity';

@Entity('loyalty_transactions')
@Index('IDX_loyalty_transactions_account_created', ['accountId', 'createdAt'])
@Index('IDX_loyalty_transactions_customer_created', ['customerId', 'createdAt'])
@Index('IDX_loyalty_transactions_payment_unique', ['paymentId'], { unique: true })
export class LoyaltyTransaction {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'account_id', type: 'bigint', nullable: false })
  accountId!: string;

  @ManyToOne(() => LoyaltyAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account?: LoyaltyAccount;

  @Column({ name: 'customer_id', type: 'bigint', nullable: false })
  customerId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: User;

  @Column({ name: 'booking_id', type: 'bigint', nullable: true })
  bookingId!: string | null;

  @ManyToOne(() => Booking, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking?: Booking;

  @Column({ name: 'payment_id', type: 'bigint', nullable: true })
  paymentId!: string | null;

  @ManyToOne(() => Payment, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'payment_id' })
  payment?: Payment;

  @Column({
    type: 'enum',
    enum: LoyaltyTransactionType,
    enumName: 'loyalty_transaction_type',
  })
  type!: LoyaltyTransactionType;

  @Column({ type: 'int' })
  points!: number;

  @Column({ type: 'varchar', length: 80 })
  source!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

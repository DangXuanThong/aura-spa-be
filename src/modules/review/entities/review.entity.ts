import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { Service } from 'src/modules/service/entities/service.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { ReviewStatus } from '../enums/review-status.enum';

@Entity('reviews')
@Index('IDX_reviews_customer_booking_service', ['customerId', 'bookingId', 'serviceId'], { unique: true })
@Index('IDX_reviews_branch_id', ['branchId'])
@Index('IDX_reviews_service_id', ['serviceId'])
@Index('IDX_reviews_technician_id', ['technicianId'])
@Index('IDX_reviews_rating', ['rating'])
@Index('IDX_reviews_branch_rating', ['branchId', 'rating'])
@Index('IDX_reviews_technician_rating', ['technicianId', 'rating'])
export class Review {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'customer_id', type: 'bigint', nullable: false })
  customerId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customer_id' })
  customer?: User;

  @Column({ name: 'booking_id', type: 'bigint', nullable: false })
  bookingId!: string;

  @ManyToOne(() => Booking, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking?: Booking;

  @Column({ name: 'service_id', type: 'bigint', nullable: true })
  serviceId!: string | null;

  @ManyToOne(() => Service, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'service_id' })
  service?: Service;

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

  @Column({ type: 'int', nullable: false })
  rating!: number; // 1–5

  @Column({ type: 'text', nullable: true })
  comment!: string | null;

  @Column({
    type: 'enum',
    enum: ReviewStatus,
    enumName: 'review_status',
    default: ReviewStatus.Published,
    nullable: false,
  })
  status!: ReviewStatus;

  @Column({ name: 'reply_text', type: 'text', nullable: true })
  replyText!: string | null;

  @Column({ name: 'replied_by', type: 'bigint', nullable: true })
  repliedBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'replied_by' })
  repliedByUser?: User;

  @Column({ name: 'replied_at', type: 'timestamptz', nullable: true })
  repliedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

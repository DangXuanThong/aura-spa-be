import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { ComplaintStatus } from '../enums/complaint-status.enum';

@Entity('complaints')
@Index('IDX_complaints_customer_id', ['customerId'])
@Index('IDX_complaints_branch_id', ['branchId'])
@Index('IDX_complaints_assigned_to', ['assignedTo'])
@Index('IDX_complaints_status', ['status'])
@Index('IDX_complaints_branch_status', ['branchId', 'status'])
@Index('IDX_complaints_customer_created', ['customerId', 'createdAt'])
export class Complaint {
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

  @Column({ name: 'booking_id', type: 'bigint', nullable: true })
  bookingId!: string | null;

  @ManyToOne(() => Booking, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'booking_id' })
  booking?: Booking;

  @Column({ type: 'varchar', length: 255, nullable: false })
  title!: string;

  @Column({ type: 'text', nullable: false })
  description!: string;

  @Column({
    type: 'enum',
    enum: ComplaintStatus,
    enumName: 'complaint_status',
    default: ComplaintStatus.Open,
    nullable: false,
  })
  status!: ComplaintStatus;

  @Column({ name: 'assigned_to', type: 'bigint', nullable: true })
  assignedTo!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_to' })
  assignedUser?: User;

  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote!: string | null;

  @Column({ name: 'resolved_at', type: 'timestamptz', nullable: true })
  resolvedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

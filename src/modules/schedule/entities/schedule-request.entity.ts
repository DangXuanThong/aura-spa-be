import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { ScheduleRequestType } from '../enums/schedule-request-type.enum';
import { ApprovalStatus } from '../enums/approval-status.enum';

@Entity('schedule_requests')
@Index('IDX_schedule_requests_staff_id', ['staffId'])
@Index('IDX_schedule_requests_branch_id', ['branchId'])
@Index('IDX_schedule_requests_status', ['status'])
@Index('IDX_schedule_requests_reviewed_by', ['reviewedBy'])
@Index('IDX_schedule_requests_staff_time', ['staffId', 'requestedStart', 'requestedEnd'])
export class ScheduleRequest {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'staff_id', type: 'bigint', nullable: false })
  staffId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'staff_id' })
  staff?: User;

  @Column({ name: 'branch_id', type: 'bigint', nullable: false })
  branchId!: string;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @Column({
    name: 'request_type',
    type: 'enum',
    enum: ScheduleRequestType,
    enumName: 'schedule_request_type',
    nullable: false,
  })
  requestType!: ScheduleRequestType;

  @Column({ name: 'requested_start', type: 'timestamptz', nullable: false })
  requestedStart!: Date;

  @Column({ name: 'requested_end', type: 'timestamptz', nullable: false })
  requestedEnd!: Date;

  @Column({
    type: 'enum',
    enum: ApprovalStatus,
    enumName: 'approval_status',
    default: ApprovalStatus.Pending,
    nullable: false,
  })
  status!: ApprovalStatus;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ name: 'reviewed_by', type: 'bigint', nullable: true })
  reviewedBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'reviewed_by' })
  reviewer?: User;

  @Column({ name: 'reviewed_at', type: 'timestamptz', nullable: true })
  reviewedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

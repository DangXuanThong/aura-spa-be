import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { ScheduleRequest } from './schedule-request.entity';
import { ScheduleType } from '../enums/schedule-type.enum';
import { ScheduleStatus } from '../enums/schedule-status.enum';

@Entity('staff_schedules')
@Index('IDX_staff_schedules_staff_id', ['staffId'])
@Index('IDX_staff_schedules_branch_id', ['branchId'])
@Index('IDX_staff_schedules_status', ['status'])
@Index('IDX_staff_schedules_staff_time', ['staffId', 'startTime', 'endTime'])
@Index('IDX_staff_schedules_branch_time', ['branchId', 'startTime', 'endTime'])
export class StaffSchedule {
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

  @Column({ name: 'start_time', type: 'timestamptz', nullable: false })
  startTime!: Date;

  @Column({ name: 'end_time', type: 'timestamptz', nullable: false })
  endTime!: Date;

  @Column({
    name: 'schedule_type',
    type: 'enum',
    enum: ScheduleType,
    enumName: 'schedule_type',
    default: ScheduleType.Working,
    nullable: false,
  })
  scheduleType!: ScheduleType;

  @Column({
    type: 'enum',
    enum: ScheduleStatus,
    enumName: 'schedule_status',
    default: ScheduleStatus.Active,
    nullable: false,
  })
  status!: ScheduleStatus;

  @Column({ name: 'source_request_id', type: 'bigint', nullable: true })
  sourceRequestId!: string | null;

  @ManyToOne(() => ScheduleRequest, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'source_request_id' })
  sourceRequest?: ScheduleRequest;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser?: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

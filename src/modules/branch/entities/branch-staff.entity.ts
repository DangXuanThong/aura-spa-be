import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { StaffStatus } from '../enums/staff-status.enum';

@Entity('branch_staff')
@Index('IDX_branch_staff_branch_user', ['branchId', 'userId'], { unique: true })
@Index('IDX_branch_staff_branch_code', ['branchId', 'staffCode'], { unique: true })
@Index('IDX_branch_staff_branch_status', ['branchId', 'status'])
@Index('IDX_branch_staff_user_status', ['userId', 'status'])
export class BranchStaff {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'branch_id', type: 'bigint', nullable: false })
  branchId!: string;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @Column({ name: 'user_id', type: 'bigint', nullable: false })
  userId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ name: 'staff_code', type: 'varchar', length: 50, nullable: true })
  staffCode!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: false })
  position!: string; // 'technician' | 'receptionist' | 'manager'

  @Column({
    type: 'enum',
    enum: StaffStatus,
    enumName: 'staff_status',
    default: StaffStatus.Active,
    nullable: false,
  })
  status!: StaffStatus;

  @Column({ name: 'start_date', type: 'date', nullable: false })
  startDate!: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

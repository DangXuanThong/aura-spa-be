import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Branch } from 'src/modules/branch/entities/branch.entity';

@Entity('branch_opening_hours')
@Index('IDX_branch_opening_hours_branch_day', ['branchId', 'dayOfWeek'], { unique: true })
export class BranchOpeningHours {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'branch_id', type: 'bigint', nullable: false })
  branchId!: string;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  branch?: Branch;

  @Column({ name: 'day_of_week', type: 'int', nullable: false })
  dayOfWeek!: number; // 0 = Sunday, 6 = Saturday

  @Column({ name: 'open_time', type: 'time', nullable: false })
  openTime!: string;

  @Column({ name: 'close_time', type: 'time', nullable: false })
  closeTime!: string;

  @Column({ name: 'is_closed', type: 'boolean', default: false, nullable: false })
  isClosed!: boolean;
}

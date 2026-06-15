import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Branch } from 'src/modules/branch/entities/branch.entity';

@Entity('booking_slot_configs')
@Index('IDX_slot_config_branch_day_time', ['branchId', 'dayOfWeek', 'startTime', 'endTime'])
@Index('IDX_slot_config_branch_effective', ['branchId', 'effectiveFrom', 'effectiveTo'])
export class BookingSlotConfig {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'branch_id', type: 'bigint', nullable: false })
  branchId!: string;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @Column({ name: 'day_of_week', type: 'int', nullable: false })
  dayOfWeek!: number; // 0 = Sunday, 6 = Saturday

  @Column({ name: 'start_time', type: 'time', nullable: false })
  startTime!: string;

  @Column({ name: 'end_time', type: 'time', nullable: false })
  endTime!: string;

  @Column({ name: 'slot_minutes', type: 'int', nullable: false })
  slotMinutes!: number;

  @Column({ name: 'max_bookings', type: 'int', nullable: false })
  maxBookings!: number;

  @Column({ name: 'effective_from', type: 'date', nullable: false })
  effectiveFrom!: Date;

  @Column({ name: 'effective_to', type: 'date', nullable: true })
  effectiveTo!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

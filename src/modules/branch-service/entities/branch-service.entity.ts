import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Branch } from '../../branch/entities/branch.entity';
import { Service } from '../../service/entities/service.entity';

@Entity('branch_services')
@Index('IDX_branch_services_branch_service', ['branchId', 'serviceId'], { unique: true })
export class BranchService {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'branch_id', type: 'bigint', nullable: false })
  branchId!: string;

  @ManyToOne(() => Branch, { onDelete: 'CASCADE' })
  branch?: Branch;

  @Column({ name: 'service_id', type: 'bigint', nullable: false })
  serviceId!: string;

  @ManyToOne(() => Service, { onDelete: 'CASCADE' })
  service?: Service;

  @Column({ name: 'is_enabled', type: 'boolean', default: true, nullable: false })
  isEnabled!: boolean;

  @Column({ name: 'duration_minutes_override', type: 'int', nullable: true })
  durationMinutesOverride!: number | null;

  @Column({ name: 'price_override', type: 'decimal', precision: 10, scale: 2, nullable: true })
  priceOverride!: number | null;

  @Column({ name: 'max_parallel_bookings', type: 'int', nullable: true })
  maxParallelBookings!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

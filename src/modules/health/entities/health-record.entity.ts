import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';

@Entity('health_records')
@Index('IDX_health_records_customer_id', ['customerId'])
@Index('IDX_health_records_branch_id', ['branchId'])
export class HealthRecord {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'customer_id', type: 'bigint', nullable: false })
  customerId!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  customer?: User;

  @Column({ name: 'branch_id', type: 'bigint', nullable: true })
  branchId!: string | null;

  @ManyToOne(() => Branch, { onDelete: 'SET NULL', nullable: true })
  branch?: Branch;

  @Column({ type: 'text', nullable: true })
  allergies!: string | null;

  @Column({ name: 'medical_conditions', type: 'text', nullable: true })
  medicalConditions!: string | null;

  @Column({ name: 'skin_type', type: 'varchar', length: 100, nullable: true })
  skinType!: string | null;

  @Column({ name: 'pregnancy_status', type: 'varchar', length: 100, nullable: true })
  pregnancyStatus!: string | null;

  @Column({ type: 'text', nullable: true })
  contraindications!: string | null;

  @Column({ type: 'text', nullable: true })
  notes!: string | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: false })
  createdBy!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  createdByUser?: User;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  updatedByUser?: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

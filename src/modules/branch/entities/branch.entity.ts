import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { BranchStatus } from '../enums/branch-status.enum';

@Entity('branches')
@Index('IDX_branches_code_unique', ['code'], { unique: true })
@Index('IDX_branches_name_unique', ['name'], { unique: true })
export class Branch {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  code!: string;

  @Column({ type: 'varchar', length: 150, nullable: false })
  name!: string;

  @Column({ type: 'text', nullable: false })
  address!: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  city!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  district!: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 8, nullable: false })
  latitude!: number; // RecommendationService dùng latitude để tính branch gần customer.

  @Column({ type: 'numeric', precision: 11, scale: 8, nullable: false })
  longitude!: number; // RecommendationService dùng longitude cùng latitude để tính khoảng cách.

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({
    type: 'enum',
    enum: BranchStatus,
    enumName: 'branch_status',
    default: BranchStatus.Active,
    nullable: false,
  })
  status!: BranchStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

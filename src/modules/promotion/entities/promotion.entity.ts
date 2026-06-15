import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { DiscountType } from '../enums/discount-type.enum';
import { PromotionStatus } from '../enums/promotion-status.enum';

@Entity('promotions')
@Index('IDX_promotions_code_unique', ['code'], { unique: true })
@Index('IDX_promotions_branch_id', ['branchId'])
@Index('IDX_promotions_status_dates', ['status', 'startsAt', 'endsAt'])
export class Promotion {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  code!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'branch_id', type: 'bigint', nullable: true })
  branchId!: string | null; // null = system-wide promotion

  @ManyToOne(() => Branch, { onDelete: 'SET NULL', nullable: true })
  branch?: Branch;

  @Column({
    name: 'discount_type',
    type: 'enum',
    enum: DiscountType,
    enumName: 'discount_type',
    nullable: false,
  })
  discountType!: DiscountType;

  @Column({ name: 'discount_value', type: 'decimal', precision: 10, scale: 2, nullable: false })
  discountValue!: number;

  @Column({ name: 'max_discount_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  maxDiscountAmount!: number | null;

  @Column({ name: 'min_order_amount', type: 'decimal', precision: 10, scale: 2, nullable: true })
  minOrderAmount!: number | null;

  @Column({ name: 'usage_limit_total', type: 'int', nullable: true })
  usageLimitTotal!: number | null;

  @Column({ name: 'usage_limit_per_customer', type: 'int', nullable: true })
  usageLimitPerCustomer!: number | null;

  @Column({ name: 'used_count', type: 'int', default: 0, nullable: false })
  usedCount!: number;

  @Column({ name: 'starts_at', type: 'timestamptz', nullable: false })
  startsAt!: Date;

  @Column({ name: 'ends_at', type: 'timestamptz', nullable: false })
  endsAt!: Date;

  @Column({
    type: 'enum',
    enum: PromotionStatus,
    enumName: 'promotion_status',
    default: PromotionStatus.Draft,
    nullable: false,
  })
  status!: PromotionStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

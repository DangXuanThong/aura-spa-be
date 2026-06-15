import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Promotion } from './promotion.entity';
import { DiscountCodeStatus } from '../enums/discount-code-status.enum';

@Entity('discount_codes')
@Index('IDX_discount_codes_code_unique', ['code'], { unique: true })
@Index('IDX_discount_codes_promotion_id', ['promotionId'])
@Index('IDX_discount_codes_status', ['status'])
export class DiscountCode {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'promotion_id', type: 'bigint', nullable: false })
  promotionId!: string;

  @ManyToOne(() => Promotion, { onDelete: 'CASCADE' })
  promotion?: Promotion;

  @Column({ type: 'varchar', length: 100, nullable: false })
  code!: string;

  @Column({ name: 'usage_limit_total', type: 'int', nullable: true })
  usageLimitTotal!: number | null;

  @Column({ name: 'usage_limit_per_customer', type: 'int', nullable: true })
  usageLimitPerCustomer!: number | null;

  @Column({ name: 'used_count', type: 'int', default: 0, nullable: false })
  usedCount!: number;

  @Column({
    type: 'enum',
    enum: DiscountCodeStatus,
    enumName: 'discount_code_status',
    default: DiscountCodeStatus.Active,
    nullable: false,
  })
  status!: DiscountCodeStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

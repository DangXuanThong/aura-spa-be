import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity';

@Entity('loyalty_accounts')
@Index('IDX_loyalty_accounts_customer_unique', ['customerId'], { unique: true })
export class LoyaltyAccount {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'customer_id', type: 'bigint', nullable: false })
  customerId!: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer?: User;

  @Column({ type: 'varchar', length: 50, default: 'Aura Member' })
  tier!: string;

  @Column({ name: 'points_balance', type: 'int', default: 0 })
  pointsBalance!: number;

  @Column({ name: 'lifetime_points', type: 'int', default: 0 })
  lifetimePoints!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

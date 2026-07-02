import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity';

export enum StrategyStatus {
  Proposed = 'proposed',
  Active = 'active',
  Completed = 'completed',
}

export enum StrategyPriority {
  High = 'high',
  Medium = 'medium',
  Low = 'low',
}

export enum StrategySource {
  Manual = 'manual',
  AiGenerated = 'ai_generated',
}

@Entity('strategies')
@Index('IDX_strategies_status', ['status'])
@Index('IDX_strategies_created_by', ['createdBy'])
export class Strategy {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  title!: string;

  @Column({ type: 'text' })
  description!: string;

  @Column({ type: 'varchar', length: 100 })
  badge!: string;

  @Column({ type: 'enum', enum: StrategyPriority, enumName: 'strategy_priority', default: StrategyPriority.Medium })
  priority!: StrategyPriority;

  @Column({ type: 'enum', enum: StrategyStatus, enumName: 'strategy_status', default: StrategyStatus.Proposed })
  status!: StrategyStatus;

  // AI-ready fields
  @Column({ type: 'enum', enum: StrategySource, enumName: 'strategy_source', default: StrategySource.Manual })
  source!: StrategySource;

  @Column({ name: 'ai_confidence', type: 'decimal', precision: 4, scale: 3, nullable: true })
  aiConfidence!: number | null;

  @Column({ name: 'supporting_data', type: 'jsonb', nullable: true })
  supportingData!: Record<string, unknown> | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: false })
  createdBy!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  createdByUser?: User;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

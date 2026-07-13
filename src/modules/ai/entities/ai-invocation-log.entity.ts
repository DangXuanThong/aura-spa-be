import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('ai_invocation_logs')
@Index('IDX_ai_invocation_logs_feature', ['feature'])
@Index('IDX_ai_invocation_logs_user_id', ['userId'])
@Index('IDX_ai_invocation_logs_created_at', ['createdAt'])
export class AiInvocationLog {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 50 })
  feature!: string;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId!: string | null;

  @Column({ name: 'branch_id', type: 'bigint', nullable: true })
  branchId!: string | null;

  @Column({ type: 'varchar', length: 50 })
  model!: string;

  @Column({ name: 'prompt_tokens', type: 'int', default: 0 })
  promptTokens!: number;

  @Column({ name: 'completion_tokens', type: 'int', default: 0 })
  completionTokens!: number;

  @Column({ name: 'estimated_cost_usd', type: 'decimal', precision: 10, scale: 6, default: 0 })
  estimatedCostUsd!: number;

  @Column({ type: 'boolean', default: true })
  success!: boolean;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'latency_ms', type: 'int', default: 0 })
  latencyMs!: number;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

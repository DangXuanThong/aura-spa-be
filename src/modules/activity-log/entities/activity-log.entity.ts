import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity('activity_logs')
@Index('IDX_activity_logs_user_id', ['userId'])
@Index('IDX_activity_logs_branch_id', ['branchId'])
@Index('IDX_activity_logs_action', ['action'])
@Index('IDX_activity_logs_occurred_at', ['occurredAt'])
export class ActivityLog {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId!: string | null;

  @Column({ name: 'user_role', type: 'varchar', length: 50, nullable: true })
  userRole!: string | null;

  @Column({ name: 'branch_id', type: 'bigint', nullable: true })
  branchId!: string | null;

  @Column({ type: 'varchar', length: 100 })
  action!: string;

  @Column({ name: 'entity_type', type: 'varchar', length: 100, nullable: true })
  entityType!: string | null;

  @Column({ name: 'entity_id', type: 'varchar', length: 255, nullable: true })
  entityId!: string | null;

  // Flexible JSONB payload — AI features read this for context without schema migrations
  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, unknown> | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'occurred_at', type: 'timestamptz', default: () => 'NOW()' })
  occurredAt!: Date;
}

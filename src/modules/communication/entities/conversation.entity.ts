import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { ConversationStatus } from '../enums/conversation-status.enum';

@Entity('conversations')
@Index('IDX_conversations_customer_id', ['customerId'])
@Index('IDX_conversations_branch_id', ['branchId'])
@Index('IDX_conversations_assigned_staff_id', ['assignedStaffId'])
@Index('IDX_conversations_status', ['status'])
@Index('IDX_conversations_branch_status', ['branchId', 'status'])
export class Conversation {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'customer_id', type: 'bigint', nullable: true })
  customerId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer?: User;

  @Column({ name: 'branch_id', type: 'bigint', nullable: true })
  branchId!: string | null;

  @ManyToOne(() => Branch, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @Column({ name: 'assigned_staff_id', type: 'bigint', nullable: true })
  assignedStaffId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'assigned_staff_id' })
  assignedStaff?: User;

  @Column({ name: 'guest_name', type: 'varchar', length: 255, nullable: true })
  guestName!: string | null;

  @Column({ name: 'guest_phone', type: 'varchar', length: 20, nullable: true })
  guestPhone!: string | null;

  @Column({ name: 'guest_email', type: 'varchar', length: 255, nullable: true })
  guestEmail!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  subject!: string | null;

  @Column({
    type: 'enum',
    enum: ConversationStatus,
    enumName: 'conversation_status',
    default: ConversationStatus.Open,
    nullable: false,
  })
  status!: ConversationStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

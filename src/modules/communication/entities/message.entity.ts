import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity';
import { Conversation } from './conversation.entity';
import { SenderType } from '../enums/sender-type.enum';

@Entity('messages')
@Index('IDX_messages_conversation_id', ['conversationId'])
@Index('IDX_messages_sender_user_id', ['senderUserId'])
@Index('IDX_messages_conversation_created', ['conversationId', 'createdAt'])
export class Message {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'conversation_id', type: 'bigint', nullable: false })
  conversationId!: string;

  @ManyToOne(() => Conversation, { onDelete: 'CASCADE' })
  conversation?: Conversation;

  @Column({ name: 'sender_user_id', type: 'bigint', nullable: true })
  senderUserId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  senderUser?: User;

  @Column({
    name: 'sender_type',
    type: 'enum',
    enum: SenderType,
    enumName: 'sender_type',
    nullable: false,
  })
  senderType!: SenderType;

  @Column({ type: 'text', nullable: false })
  message!: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments!: object[] | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

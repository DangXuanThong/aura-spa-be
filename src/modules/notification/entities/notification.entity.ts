import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum NotificationStatus {
  Pending = 'pending',
  Sent = 'sent',
  Failed = 'failed',
}

export enum NotificationChannel {
  Email = 'email',
  Sms = 'sms',
  Both = 'both',
  InApp = 'in_app',
}

@Entity('notifications')
@Index('IDX_notifications_recipient_user_id', ['recipientUserId'])
@Index('IDX_notifications_recipient_role', ['recipientRole'])
@Index('IDX_notifications_status', ['status'])
@Index('IDX_notifications_created_at', ['createdAt'])
export class Notification {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'recipient_user_id', type: 'bigint', nullable: true })
  recipientUserId!: string | null;

  @Column({ name: 'recipient_role', type: 'varchar', length: 50, nullable: true })
  recipientRole!: string | null;

  @Column({ name: 'notification_type', type: 'varchar', length: 100 })
  notificationType!: string;

  @Column({ type: 'text' })
  message!: string;

  @Column({ type: 'enum', enum: NotificationStatus, enumName: 'notification_status', default: NotificationStatus.Pending })
  status!: NotificationStatus;

  @Column({ type: 'enum', enum: NotificationChannel, enumName: 'notification_channel', default: NotificationChannel.InApp })
  channel!: NotificationChannel;

  @Column({ name: 'related_entity_type', type: 'varchar', length: 100, nullable: true })
  relatedEntityType!: string | null;

  @Column({ name: 'related_entity_id', type: 'varchar', length: 255, nullable: true })
  relatedEntityId!: string | null;

  @Column({ name: 'read_at', type: 'timestamptz', nullable: true })
  readAt!: Date | null;

  @Column({ name: 'sent_at', type: 'timestamptz', nullable: true })
  sentAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

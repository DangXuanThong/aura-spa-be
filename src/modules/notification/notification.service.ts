import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Notification, NotificationChannel, NotificationStatus } from './entities/notification.entity';

export interface CreateNotificationParams {
  recipientUserId?: string;
  recipientRole?: string;
  notificationType: string;
  message: string;
  channel?: NotificationChannel;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly repo: Repository<Notification>,
  ) {}

  async create(params: CreateNotificationParams): Promise<Notification> {
    return this.repo.save(
      this.repo.create({
        recipientUserId: params.recipientUserId ?? null,
        recipientRole: params.recipientRole ?? null,
        notificationType: params.notificationType,
        message: params.message,
        channel: params.channel ?? NotificationChannel.InApp,
        relatedEntityType: params.relatedEntityType ?? null,
        relatedEntityId: params.relatedEntityId ?? null,
        status: NotificationStatus.Sent,
        sentAt: new Date(),
        readAt: null,
      }),
    );
  }

  findForOwner(userId: string, limit = 50): Promise<Notification[]> {
    return this.repo.find({
      where: [
        { recipientUserId: userId },
        { recipientRole: 'owner', recipientUserId: IsNull() },
      ],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  // Returns notifications sent to this specific user OR system-wide role broadcasts (recipientUserId IS NULL)
  findForUser(userId: string, role: string, limit = 50): Promise<Notification[]> {
    return this.repo.find({
      where: [
        { recipientUserId: userId },
        { recipientRole: role, recipientUserId: IsNull() },
      ],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async markRead(id: string, userId: string): Promise<void> {
    const notification = await this.repo.findOne({ where: { id } });
    if (!notification) throw new NotFoundException(`Notification ${id} not found`);
    if (notification.recipientUserId !== null && notification.recipientUserId !== userId) {
      throw new ForbiddenException('You do not have access to this notification');
    }
    await this.repo.update(id, { readAt: new Date() });
  }
}

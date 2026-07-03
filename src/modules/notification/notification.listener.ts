import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BOOKING_EVENTS, INVENTORY_EVENTS, PAYMENT_EVENTS } from 'src/common/constants/events';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { ActivityLogService } from 'src/modules/activity-log/activity-log.service';
import { NotificationChannel } from './entities/notification.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { StaffPosition } from 'src/modules/branch/enums/staff-position.enum';

@Injectable()
export class NotificationListener {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly activityLogService: ActivityLogService,
    @InjectRepository(BranchStaff)
    private readonly branchStaffRepo: Repository<BranchStaff>,
    private readonly gateway: NotificationGateway,
  ) {}

  private async getActiveBranchUserIds(branchId: string, positions?: StaffPosition[]): Promise<string[]> {
    const where: any = { branchId, status: StaffStatus.Active };
    if (positions?.length) where.position = In(positions);
    const records = await this.branchStaffRepo.find({ where, select: ['userId'] });
    return records.map((r) => r.userId);
  }

  @OnEvent(BOOKING_EVENTS.CREATED)
  async handleBookingCreated(payload: { bookingId: string; customerId: string; branchId: string; staffId?: string }) {
    // Notify customer
    const customerNotif = await this.notificationService.create({
      recipientUserId: payload.customerId,
      notificationType: 'booking_confirmed',
      message: 'Lịch hẹn của bạn đã được đặt thành công.',
      channel: NotificationChannel.InApp,
      relatedEntityType: 'booking',
      relatedEntityId: payload.bookingId,
    });
    this.gateway.sendToUser(payload.customerId, customerNotif);

    // Notify only managers and staff who work at this specific branch
    const branchUserIds = await this.getActiveBranchUserIds(payload.branchId);
    await Promise.all(
      branchUserIds.map(async (userId) => {
        const notif = await this.notificationService.create({
          recipientUserId: userId,
          notificationType: 'booking_confirmed',
          message: `Có lịch hẹn mới vừa được đặt tại chi nhánh.`,
          channel: NotificationChannel.InApp,
          relatedEntityType: 'booking',
          relatedEntityId: payload.bookingId,
        });
        this.gateway.sendToUser(userId, notif);
      }),
    );

    this.activityLogService.log({
      userId: payload.customerId,
      branchId: payload.branchId,
      action: BOOKING_EVENTS.CREATED,
      entityType: 'booking',
      entityId: payload.bookingId,
      metadata: { branchId: payload.branchId },
    });
  }

  @OnEvent(BOOKING_EVENTS.CANCELLED)
  async handleBookingCancelled(payload: { bookingId: string; customerId: string; branchId: string; reason?: string }) {
    // Notify customer
    const customerNotif = await this.notificationService.create({
      recipientUserId: payload.customerId,
      notificationType: 'booking_cancelled',
      message: 'Lịch hẹn của bạn đã được hủy.',
      channel: NotificationChannel.InApp,
      relatedEntityType: 'booking',
      relatedEntityId: payload.bookingId,
    });
    this.gateway.sendToUser(payload.customerId, customerNotif);

    // Notify only managers and staff of the affected branch
    const branchUserIds = await this.getActiveBranchUserIds(payload.branchId);
    await Promise.all(
      branchUserIds.map(async (userId) => {
        const notif = await this.notificationService.create({
          recipientUserId: userId,
          notificationType: 'booking_cancelled',
          message: `Một lịch hẹn vừa bị hủy tại chi nhánh.`,
          channel: NotificationChannel.InApp,
          relatedEntityType: 'booking',
          relatedEntityId: payload.bookingId,
        });
        this.gateway.sendToUser(userId, notif);
      }),
    );

    this.activityLogService.log({
      userId: payload.customerId,
      branchId: payload.branchId,
      action: BOOKING_EVENTS.CANCELLED,
      entityType: 'booking',
      entityId: payload.bookingId,
      metadata: { reason: payload.reason },
    });
  }

  @OnEvent(BOOKING_EVENTS.COMPLETED)
  async handleBookingCompleted(payload: { bookingId: string; customerId: string; branchId: string; staffId: string }) {
    const notif = await this.notificationService.create({
      recipientUserId: payload.customerId,
      notificationType: 'booking_completed',
      message: 'Dịch vụ của bạn đã được hoàn thành. Cảm ơn bạn đã sử dụng dịch vụ!',
      channel: NotificationChannel.InApp,
      relatedEntityType: 'booking',
      relatedEntityId: payload.bookingId,
    });
    this.gateway.sendToUser(payload.customerId, notif);

    this.activityLogService.log({
      userId: payload.staffId,
      branchId: payload.branchId,
      action: BOOKING_EVENTS.COMPLETED,
      entityType: 'booking',
      entityId: payload.bookingId,
      metadata: { customerId: payload.customerId },
    });
  }

  @OnEvent(BOOKING_EVENTS.WALK_IN_PHONE_CONFLICT)
  async handleWalkInPhoneConflict(payload: {
    branchId: string;
    staffId: string;
    customerName: string;
    customerPhone: string;
    conflictingUserId: string;
    conflictingRole: string;
    conflictingStatus: string;
    reason: 'internal_account' | 'inactive_customer';
  }) {
    const managerIds = await this.getActiveBranchUserIds(payload.branchId, [StaffPosition.Manager]);
    const recipientIds = Array.from(new Set([payload.staffId, ...managerIds]));
    const roleLabelByValue: Record<string, string> = {
      owner: 'chủ hệ thống',
      manager: 'quản lý',
      staff: 'nhân viên',
      admin: 'quản trị viên',
    };
    const statusLabelByValue: Record<string, string> = {
      inactive: 'chưa hoạt động',
      suspended: 'đang bị khóa',
      deleted: 'đã bị xóa',
    };
    const reasonText =
      payload.reason === 'internal_account'
        ? `số điện thoại này đang thuộc tài khoản ${roleLabelByValue[payload.conflictingRole] ?? 'nội bộ'}`
        : `tài khoản khách hàng dùng số này ${statusLabelByValue[payload.conflictingStatus] ?? 'không còn hoạt động'}`;
    const message = `Không thể tạo lịch vãng lai cho khách ${payload.customerName} (${payload.customerPhone}) vì ${reasonText}. Vui lòng kiểm tra lại hoặc dùng số điện thoại khác.`;

    await Promise.all(
      recipientIds.map(async (userId) => {
        const notif = await this.notificationService.create({
          recipientUserId: userId,
          notificationType: 'walk_in_phone_conflict',
          message,
          channel: NotificationChannel.InApp,
          relatedEntityType: 'user',
          relatedEntityId: payload.conflictingUserId,
        });
        this.gateway.sendToUser(userId, notif);
      }),
    );

    this.activityLogService.log({
      userId: payload.staffId,
      branchId: payload.branchId,
      action: BOOKING_EVENTS.WALK_IN_PHONE_CONFLICT,
      entityType: 'user',
      entityId: payload.conflictingUserId,
      metadata: {
        customerName: payload.customerName,
        customerPhone: payload.customerPhone,
        conflictingRole: payload.conflictingRole,
        conflictingStatus: payload.conflictingStatus,
        reason: payload.reason,
      },
    });
  }

  @OnEvent(PAYMENT_EVENTS.PROCESSED)
  async handlePaymentProcessed(payload: { paymentId: string; invoiceId: string | null; customerId: string; branchId: string; amount: number }) {
    const notif = await this.notificationService.create({
      recipientUserId: payload.customerId,
      notificationType: 'payment_confirmed',
      message: `Thanh toán ${payload.amount.toLocaleString('vi-VN')} VNĐ đã được xác nhận thành công.`,
      channel: NotificationChannel.InApp,
      relatedEntityType: 'payment',
      relatedEntityId: payload.paymentId,
    });
    this.gateway.sendToUser(payload.customerId, notif);
  }

  @OnEvent(PAYMENT_EVENTS.DEPOSIT_PAID)
  async handleDepositPaid(payload: { paymentId: string; invoiceId: string | null; customerId: string; branchId: string; amount: number }) {
    const notif = await this.notificationService.create({
      recipientUserId: payload.customerId,
      notificationType: 'deposit_confirmed',
      message: `Đặt cọc ${payload.amount.toLocaleString('vi-VN')} VNĐ đã được xác nhận. Hẹn gặp bạn tại buổi hẹn!`,
      channel: NotificationChannel.InApp,
      relatedEntityType: 'payment',
      relatedEntityId: payload.paymentId,
    });
    this.gateway.sendToUser(payload.customerId, notif);
  }

  @OnEvent(INVENTORY_EVENTS.LOW_STOCK)
  async handleLowStock(payload: { itemId: string; itemName: string; branchId: string; currentQty: number }) {
    // Notify only managers of this specific branch (not all staff)
    const branchUserIds = await this.getActiveBranchUserIds(payload.branchId, [StaffPosition.Manager]);
    for (const userId of branchUserIds) {
      const notif = await this.notificationService.create({
        recipientUserId: userId,
        notificationType: 'low_inventory',
        message: `Cảnh báo: ${payload.itemName} còn ${payload.currentQty} đơn vị. Vui lòng nhập hàng sớm.`,
        channel: NotificationChannel.InApp,
        relatedEntityType: 'inventory_item',
        relatedEntityId: payload.itemId,
      });
      this.gateway.sendToUser(userId, notif);
    }

    this.activityLogService.log({
      branchId: payload.branchId,
      action: INVENTORY_EVENTS.LOW_STOCK,
      entityType: 'inventory_item',
      entityId: payload.itemId,
      metadata: { itemName: payload.itemName, currentQty: payload.currentQty },
    });
  }
}

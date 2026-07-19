import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ActivityLog } from 'src/modules/activity-log/entities/activity-log.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BookingService as BookingServiceEntity } from 'src/modules/booking/entities/booking-service.entity';
import { BookingSource } from 'src/modules/booking/enums/booking-source.enum';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { StaffPosition } from 'src/modules/branch/enums/staff-position.enum';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { BranchService } from 'src/modules/branch-service/entities/branch-service.entity';
import { BranchInventory } from 'src/modules/inventory/entities/branch-inventory.entity';
import { InventoryTransaction } from 'src/modules/inventory/entities/inventory-transaction.entity';
import { InventoryTransactionType } from 'src/modules/inventory/enums/inventory-transaction-type.enum';
import { LoyaltyAccount } from 'src/modules/loyalty/entities/loyalty-account.entity';
import { LoyaltyTransaction } from 'src/modules/loyalty/entities/loyalty-transaction.entity';
import { LoyaltyTransactionType } from 'src/modules/loyalty/enums/loyalty-transaction-type.enum';
import { Notification, NotificationChannel, NotificationStatus } from 'src/modules/notification/entities/notification.entity';
import { PaymentTransaction } from 'src/modules/payment/domain/entities/payment-transaction.entity';
import { PaymentProvider } from 'src/modules/payment/domain/enums/payment-provider.enum';
import { PaymentTransactionStatus } from 'src/modules/payment/domain/enums/payment-transaction-status.enum';
import { PaymentTransactionType } from 'src/modules/payment/domain/enums/payment-transaction-type.enum';
import { Payment } from 'src/modules/payment/entities/payment.entity';
import { PaymentMethod } from 'src/modules/payment/enums/payment-method.enum';
import { PaymentStatus } from 'src/modules/payment/enums/payment-status.enum';
import { PaymentType } from 'src/modules/payment/enums/payment-type.enum';
import { BranchDailyAggregate } from 'src/modules/report/entities/branch-daily-aggregate.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { AuthProvider } from 'src/modules/user/enums/auth-provider.enum';
import { Gender } from 'src/modules/user/enums/gender.enum';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { UserStatus } from 'src/modules/user/enums/user-status.enum';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class OperationalDemoSeeder {
  private readonly logger = new Logger(OperationalDemoSeeder.name);

  constructor(
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingServiceEntity) private readonly bookingServiceRepo: Repository<BookingServiceEntity>,
    @InjectRepository(BranchService) private readonly branchServiceRepo: Repository<BranchService>,
    @InjectRepository(BranchStaff) private readonly branchStaffRepo: Repository<BranchStaff>,
    @InjectRepository(BranchInventory) private readonly branchInventoryRepo: Repository<BranchInventory>,
    @InjectRepository(InventoryTransaction) private readonly inventoryTransactionRepo: Repository<InventoryTransaction>,
    @InjectRepository(LoyaltyAccount) private readonly loyaltyAccountRepo: Repository<LoyaltyAccount>,
    @InjectRepository(LoyaltyTransaction) private readonly loyaltyTransactionRepo: Repository<LoyaltyTransaction>,
    @InjectRepository(Notification) private readonly notificationRepo: Repository<Notification>,
    @InjectRepository(ActivityLog) private readonly activityLogRepo: Repository<ActivityLog>,
    @InjectRepository(BranchDailyAggregate) private readonly aggregateRepo: Repository<BranchDailyAggregate>,
    @InjectRepository(PaymentTransaction) private readonly paymentTransactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
  ) {}

  async seed(): Promise<void> {
    const [branches, owner, originalCustomers] = await Promise.all([
      this.branchRepo.find({ order: { id: 'ASC' } }),
      this.userRepo.findOne({ where: { role: UserRole.Owner } }),
      this.userRepo.find({ where: { role: UserRole.Customer }, order: { id: 'ASC' } }),
    ]);

    await this.seedDistributedCustomerBookings(branches, originalCustomers);

    const [customers, users, bookings] = await Promise.all([
      this.userRepo.find({ where: { role: UserRole.Customer }, order: { id: 'ASC' } }),
      this.userRepo.find({ order: { id: 'ASC' } }),
      this.bookingRepo.find({ order: { id: 'ASC' } }),
    ]);

    await this.seedLoyalty(customers);
    await this.seedNotifications(customers, users, branches);
    await this.seedActivityLogs(users, branches, bookings);
    if (owner) await this.seedInventoryHistory(owner.id);
    await this.seedOperationalRevenue(bookings);
    await this.seedPaymentTransactions(bookings);
    await this.seedBranchAggregates(branches);

    this.logger.log('Professional operational demo data is ready');
  }

  private async seedDistributedCustomerBookings(branches: Branch[], originalCustomers: User[]): Promise<void> {
    if (branches.length === 0) return;

    const [branchServices, technicians, currentBookings] = await Promise.all([
      this.branchServiceRepo.find({ where: { isEnabled: true }, relations: ['service'], order: { id: 'ASC' } }),
      this.branchStaffRepo.find({
        where: { position: StaffPosition.Technician, status: StaffStatus.Active },
        order: { id: 'ASC' },
      }),
      this.bookingRepo.find({ order: { id: 'ASC' } }),
    ]);
    const existingMarkers = new Set(currentBookings.map((booking) => booking.notes).filter(Boolean));
    const customersWithBookings = new Set(currentBookings.map((booking) => booking.customerId));
    const servicesByBranch = new Map<string, BranchService[]>();
    const techniciansByBranch = new Map<string, BranchStaff[]>();

    for (const branchService of branchServices) {
      const rows = servicesByBranch.get(branchService.branchId) ?? [];
      rows.push(branchService);
      servicesByBranch.set(branchService.branchId, rows);
    }
    for (const technician of technicians) {
      const rows = techniciansByBranch.get(technician.branchId) ?? [];
      rows.push(technician);
      techniciansByBranch.set(technician.branchId, rows);
    }

    const walkInNames = [
      'Nguyá»…n Thá»‹ Thanh Mai',
      'Tráº§n Minh KhÃ´i',
      'LÃª Ngá»c HÃ¢n',
      'Pháº¡m Gia Báº£o',
      'HoÃ ng ThÃ¹y Linh',
      'VÃµ Anh ThÆ°',
      'Äáº·ng Quang Huy',
      'BÃ¹i PhÆ°Æ¡ng Nhi',
      'Äá»— KhÃ¡nh An',
      'HÃ  Tuáº¥n Kiá»‡t',
      'Nguyá»…n Diá»‡u Anh',
      'TrÆ°Æ¡ng Nháº­t Nam',
      'LÃ½ Báº£o Ngá»c',
      'Phan HoÃ ng Long',
      'VÅ© Thanh TrÃºc',
      'NgÃ´ Minh ChÃ¢u',
      'DÆ°Æ¡ng Háº£i ÄÄƒng',
      'Mai Quá»³nh Trang',
      'Cao Tuáº¥n Anh',
      'Táº¡ Ngá»c Diá»‡p',
      'Nguyá»…n HoÃ ng PhÃºc',
      'Tráº§n Yáº¿n Nhi',
      'LÃª Äá»©c Thá»‹nh',
      'Pháº¡m Tháº£o Vy',
      'HoÃ ng Báº£o TrÃ¢m',
      'VÃµ Minh Triáº¿t',
      'Äáº·ng ThÃ¹y DÆ°Æ¡ng',
      'BÃ¹i Quá»‘c Báº£o',
      'Äá»— Thanh HÃ ',
      'HÃ  Ngá»c Ánh',
      'TrÆ°Æ¡ng Gia HÃ¢n',
      'LÃ½ Minh QuÃ¢n',
      'Phan Tháº£o NguyÃªn',
      'VÅ© KhÃ¡nh Ly',
      'NgÃ´ Anh Khoa',
    ];

    const bookingSeeds: Array<{ customer: User; branch: Branch; source: BookingSource; marker: string; sequence: number }> = [];
    for (const [branchIndex, branch] of branches.entries()) {
      for (let customerIndex = 0; customerIndex < 5; customerIndex++) {
        const sequence = branchIndex * 5 + customerIndex;
        const phone = `0388${String(sequence + 1).padStart(6, '0')}`;
        let customer = await this.userRepo.findOne({ where: { phone } });
        if (!customer) {
          customer = await this.userRepo.save(
            this.userRepo.create({
              email: null,
              phone,
              passwordHash: null,
              role: UserRole.Customer,
              status: UserStatus.Active,
              authProvider: AuthProvider.Email,
              providerUserId: null,
              fullName: walkInNames[sequence],
              avatarUrl: null,
              gender: sequence % 4 === 1 ? Gender.Male : Gender.Female,
              dateOfBirth: null,
              address: branch.name,
              isActive: false,
              notificationEnabled: true,
            }),
          );
        }
        bookingSeeds.push({
          customer,
          branch,
          source: BookingSource.WalkIn,
          marker: `professional-demo-walk-in:${phone}`,
          sequence,
        });
      }
    }

    const unbookedOriginalCustomers = originalCustomers.filter((customer) => !customersWithBookings.has(customer.id));
    for (const [index, customer] of unbookedOriginalCustomers.entries()) {
      bookingSeeds.push({
        customer,
        branch: branches[index % branches.length],
        source: BookingSource.Online,
        marker: `professional-demo-distributed:${customer.id}`,
        sequence: walkInNames.length + index,
      });
    }

    let seededBookings = 0;
    for (const seed of bookingSeeds) {
      if (existingMarkers.has(seed.marker)) continue;
      const availableServices = servicesByBranch.get(seed.branch.id) ?? [];
      const availableTechnicians = techniciansByBranch.get(seed.branch.id) ?? [];
      if (availableServices.length === 0 || availableTechnicians.length === 0) continue;

      const branchService = availableServices[seed.sequence % availableServices.length];
      const technician = availableTechnicians[seed.sequence % availableTechnicians.length];
      const durationMinutes = branchService.durationMinutesOverride ?? branchService.service?.defaultDurationMinutes ?? 60;
      const unitPrice = Number(branchService.priceOverride ?? branchService.service?.defaultPrice ?? 850000);
      const statusCycle =
        seed.source === BookingSource.WalkIn
          ? [BookingStatus.Completed, BookingStatus.Completed, BookingStatus.Completed, BookingStatus.Completed, BookingStatus.Cancelled]
          : [BookingStatus.Completed, BookingStatus.Completed, BookingStatus.Completed, BookingStatus.Confirmed, BookingStatus.Cancelled];
      const status = statusCycle[seed.sequence % statusCycle.length];
      const isFuture = status === BookingStatus.Confirmed;
      const dayOffset = isFuture ? (seed.sequence % 7) + 1 : -((seed.sequence % 27) + 1);
      const startTime = new Date(Date.now() + dayOffset * DAY_MS);
      startTime.setHours(9 + (seed.sequence % 8), seed.sequence % 2 === 0 ? 0 : 30, 0, 0);
      const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);
      const isCompleted = status === BookingStatus.Completed;
      const isCancelled = status === BookingStatus.Cancelled;

      const booking = await this.bookingRepo.save(
        this.bookingRepo.create({
          customerId: seed.customer.id,
          branchId: seed.branch.id,
          technicianId: technician.userId,
          discountCodeId: null,
          startTime,
          endTime,
          status,
          source: seed.source,
          subtotalAmount: unitPrice,
          discountAmount: 0,
          depositRequiredAmount: 0,
          paidAmount: 0,
          remainingAmount: isCancelled ? 0 : unitPrice,
          room: null,
          notes: seed.marker,
          cancelReason: isCancelled ? 'KhÃ¡ch thay Ä‘á»•i káº¿ hoáº¡ch cÃ¡ nhÃ¢n' : null,
          transferredFromBranchId: null,
          rescheduledFromBookingId: null,
          createdBy: seed.source === BookingSource.WalkIn ? technician.userId : seed.customer.id,
          checkedInAt: isCompleted ? startTime : null,
          completedAt: isCompleted ? endTime : null,
          cancelledAt: isCancelled ? new Date(startTime.getTime() - 2 * 60 * 60 * 1000) : null,
        }),
      );

      await this.bookingServiceRepo.save(
        this.bookingServiceRepo.create({
          bookingId: booking.id,
          serviceId: branchService.serviceId,
          quantity: 1,
          durationMinutes,
          unitPrice,
          discountAmount: 0,
          finalAmount: unitPrice,
        }),
      );
      existingMarkers.add(seed.marker);
      seededBookings++;
    }

    this.logger.log(`Seeded distributed bookings for ${seededBookings} customer(s) across ${branches.length} branches`);
  }

  private async seedLoyalty(customers: User[]): Promise<void> {
    for (const [index, customer] of customers.entries()) {
      let account = await this.loyaltyAccountRepo.findOne({ where: { customerId: customer.id } });
      const lifetimePoints = 350 + ((index * 470) % 5200);
      const pointsBalance = 100 + ((index * 215) % Math.max(250, lifetimePoints));
      const tier = lifetimePoints >= 4000 ? 'Aura Diamond' : lifetimePoints >= 1800 ? 'Aura Gold' : 'Aura Member';

      if (!account) {
        account = await this.loyaltyAccountRepo.save(
          this.loyaltyAccountRepo.create({ customerId: customer.id, tier, pointsBalance, lifetimePoints }),
        );
      }

      const source = 'professional-demo-opening-balance';
      const transaction = await this.loyaltyTransactionRepo.findOne({ where: { accountId: account.id, source } });
      if (!transaction) {
        await this.loyaltyTransactionRepo.save(
          this.loyaltyTransactionRepo.create({
            accountId: account.id,
            customerId: customer.id,
            bookingId: null,
            paymentId: null,
            type: LoyaltyTransactionType.Adjust,
            points: pointsBalance,
            source,
            description: 'Số dư điểm thành viên dùng cho môi trường demo chuyên nghiệp',
          }),
        );
      }
    }
  }

  private async seedNotifications(customers: User[], users: User[], branches: Branch[]): Promise<void> {
    const existing = await this.notificationRepo.count({ where: { notificationType: 'demo.welcome' } });
    if (existing > 0) return;

    const now = Date.now();
    const customerNotifications = customers.slice(0, 20).flatMap((customer, index) => [
      this.notificationRepo.create({
        recipientUserId: customer.id,
        recipientRole: UserRole.Customer,
        notificationType: 'demo.welcome',
        message: `Chào ${customer.fullName}, Aura Spa tặng bạn 100 điểm thành viên cho lần trải nghiệm tiếp theo.`,
        status: NotificationStatus.Sent,
        channel: NotificationChannel.InApp,
        relatedEntityType: 'loyalty_account',
        relatedEntityId: customer.id,
        readAt: index % 3 === 0 ? new Date(now - index * DAY_MS) : null,
        sentAt: new Date(now - (index + 1) * DAY_MS),
      }),
      this.notificationRepo.create({
        recipientUserId: customer.id,
        recipientRole: UserRole.Customer,
        notificationType: 'demo.care_tip',
        message: 'Mẹo từ Aura: uống đủ nước và dưỡng ẩm đều đặn để duy trì hiệu quả sau liệu trình.',
        status: NotificationStatus.Sent,
        channel: NotificationChannel.InApp,
        relatedEntityType: null,
        relatedEntityId: null,
        readAt: null,
        sentAt: new Date(now - index * 12 * 60 * 60 * 1000),
      }),
    ]);

    const managers = users.filter((user) => user.role === UserRole.Manager || user.role === UserRole.Owner);
    const managementNotifications = managers.map((user, index) =>
      this.notificationRepo.create({
        recipientUserId: user.id,
        recipientRole: user.role,
        notificationType: 'demo.daily_summary',
        message: `Báo cáo vận hành ${branches[index % Math.max(1, branches.length)]?.name ?? 'toàn hệ thống'} đã sẵn sàng.`,
        status: NotificationStatus.Sent,
        channel: NotificationChannel.InApp,
        relatedEntityType: 'branch',
        relatedEntityId: branches[index % Math.max(1, branches.length)]?.id ?? null,
        readAt: index % 2 === 0 ? new Date(now - index * 60 * 60 * 1000) : null,
        sentAt: new Date(now - index * 60 * 60 * 1000),
      }),
    );

    await this.notificationRepo.save([...customerNotifications, ...managementNotifications], { chunk: 100 });
  }

  private async seedActivityLogs(users: User[], branches: Branch[], bookings: Booking[]): Promise<void> {
    const marker = await this.activityLogRepo.findOne({ where: { action: 'system.demo_seed' } });
    if (marker || users.length === 0) return;

    const actions = ['auth.login', 'booking.view', 'booking.update', 'inventory.view', 'report.export', 'customer.consult'];
    const rows = Array.from({ length: 72 }, (_, index) => {
      const user = users[index % users.length];
      const branch = branches[index % Math.max(1, branches.length)];
      const booking = bookings[index % Math.max(1, bookings.length)];
      return this.activityLogRepo.create({
        userId: user.id,
        userRole: user.role,
        branchId: branch?.id ?? null,
        action: index === 0 ? 'system.demo_seed' : actions[index % actions.length],
        entityType: booking && index % 3 !== 0 ? 'booking' : 'dashboard',
        entityId: booking && index % 3 !== 0 ? booking.id : null,
        metadata: { demo: true, channel: index % 2 === 0 ? 'web' : 'mobile', sequence: index + 1 },
        ipAddress: `10.0.${Math.floor(index / 250)}.${(index % 250) + 1}`,
        occurredAt: new Date(Date.now() - index * 6 * 60 * 60 * 1000),
      });
    });
    await this.activityLogRepo.save(rows, { chunk: 100 });
  }

  private async seedInventoryHistory(ownerId: string): Promise<void> {
    const markerReason = 'Nhập kho định kỳ đầu tháng - professional demo';
    const marker = await this.inventoryTransactionRepo.findOne({ where: { reason: markerReason } });
    if (marker) return;
    const stocks = await this.branchInventoryRepo.find({ order: { id: 'ASC' } });
    const rows = stocks.flatMap((stock, index) => {
      const currentQuantity = Number(stock.currentQuantity);
      return [
        this.inventoryTransactionRepo.create({
          branchId: stock.branchId,
          inventoryItemId: stock.inventoryItemId,
          transactionType: InventoryTransactionType.Import,
          quantityDelta: Math.max(10, Math.round(currentQuantity * 1.4)),
          quantityAfter: Math.max(10, Math.round(currentQuantity * 1.4)),
          bookingId: null,
          serviceId: null,
          staffId: null,
          reason: markerReason,
          createdBy: ownerId,
          createdAt: new Date(Date.now() - (30 + (index % 10)) * DAY_MS),
        }),
        this.inventoryTransactionRepo.create({
          branchId: stock.branchId,
          inventoryItemId: stock.inventoryItemId,
          transactionType: InventoryTransactionType.Consume,
          quantityDelta: -Math.max(1, Math.round(currentQuantity * 0.4)),
          quantityAfter: currentQuantity,
          bookingId: null,
          serviceId: null,
          staffId: null,
          reason: 'Tổng hợp tiêu hao dịch vụ trong tháng - professional demo',
          createdBy: ownerId,
          createdAt: new Date(Date.now() - (index % 10) * DAY_MS),
        }),
      ];
    });
    await this.inventoryTransactionRepo.save(rows, { chunk: 100 });
  }

  private async seedOperationalRevenue(bookings: Booking[]): Promise<void> {
    const completedBookings = bookings.filter((booking) => booking.status === BookingStatus.Completed);
    if (completedBookings.length === 0) return;

    const existingPayments = await this.paymentRepo.find({
      where: {
        bookingId: In(completedBookings.map((booking) => booking.id)),
        status: In([PaymentStatus.Paid, PaymentStatus.PartiallyRefunded]),
      },
    });
    const paidBookingIds = new Set(existingPayments.map((payment) => payment.bookingId).filter(Boolean));
    const unpaidCompletedBookings = completedBookings.filter((booking) => !paidBookingIds.has(booking.id));
    if (unpaidCompletedBookings.length === 0) return;

    const realisticServicePrices = [850000, 1100000, 1350000, 1600000, 2200000];
    const paymentMethods = [PaymentMethod.Cash, PaymentMethod.Card, PaymentMethod.BankTransfer, PaymentMethod.EWallet];
    const payments: Payment[] = [];

    for (const [index, booking] of unpaidCompletedBookings.entries()) {
      const subtotal = Number(booking.subtotalAmount) || 0;
      const discount = Number(booking.discountAmount) || 0;
      const amount = Math.max(subtotal - discount, realisticServicePrices[index % realisticServicePrices.length]);
      const paidAt = booking.completedAt ?? booking.endTime;

      await this.bookingRepo.update(booking.id, {
        subtotalAmount: amount + discount,
        paidAmount: amount,
        remainingAmount: 0,
      });

      payments.push(
        this.paymentRepo.create({
          invoiceId: null,
          bookingId: booking.id,
          customerId: booking.customerId,
          branchId: booking.branchId,
          paymentType: PaymentType.FullPayment,
          paymentMethod: paymentMethods[index % paymentMethods.length],
          status: PaymentStatus.Paid,
          amount,
          paidAt,
          receivedBy: booking.technicianId,
          refundedAmount: 0,
          refundReason: null,
        }),
      );
    }

    await this.paymentRepo.save(payments, { chunk: 100 });
    this.logger.log(`Seeded ${payments.length} completed-booking payment(s) with realistic revenue`);
  }

  private async seedPaymentTransactions(bookings: Booking[]): Promise<void> {
    const marker = await this.paymentTransactionRepo.findOne({ where: { referenceCode: 'DEMO000001' } });
    if (marker) return;
    const existingTransactions = await this.paymentTransactionRepo.find();
    const occupiedBookingIds = new Set(existingTransactions.map((transaction) => transaction.bookingId));
    const selected = bookings.filter((booking) => !occupiedBookingIds.has(booking.id)).slice(0, 12);
    const statuses = [
      PaymentTransactionStatus.Paid,
      PaymentTransactionStatus.Paid,
      PaymentTransactionStatus.Pending,
      PaymentTransactionStatus.Expired,
      PaymentTransactionStatus.Failed,
      PaymentTransactionStatus.Cancelled,
    ];
    const rows = selected.map((booking, index) => {
      const status = statuses[index % statuses.length];
      const amount = Number(booking.depositRequiredAmount) || Math.round(Number(booking.subtotalAmount) * 0.3);
      const createdAt = new Date(Date.now() - (selected.length - index) * DAY_MS);
      return this.paymentTransactionRepo.create({
        bookingId: booking.id,
        branchId: booking.branchId,
        customerId: booking.customerId,
        provider: index % 4 === 0 ? PaymentProvider.Manual : PaymentProvider.SePay,
        transactionType: PaymentTransactionType.Deposit,
        status,
        amount: Math.max(100000, amount),
        currency: 'VND',
        referenceCode: `DEMO${String(index + 1).padStart(6, '0')}`,
        sepayTransactionId: status === PaymentTransactionStatus.Paid ? `900000${index + 1}` : null,
        bankReferenceCode: status === PaymentTransactionStatus.Paid ? `AURA-DEMO-${index + 1}` : null,
        transferContent: `Thanh toan coc Aura Spa DEMO${String(index + 1).padStart(6, '0')}`,
        rawWebhookPayload: status === PaymentTransactionStatus.Paid ? { demo: true, verified: true } : null,
        qrImageUrl: null,
        expiresAt: new Date(createdAt.getTime() + 15 * 60 * 1000),
        paidAt: status === PaymentTransactionStatus.Paid ? new Date(createdAt.getTime() + 5 * 60 * 1000) : null,
        createdAt,
      });
    });
    await this.paymentTransactionRepo.save(rows);
  }

  private async seedBranchAggregates(branches: Branch[]): Promise<void> {
    if ((await this.aggregateRepo.count()) > 0 || branches.length === 0) return;

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const rows: BranchDailyAggregate[] = [];
    for (const [branchIndex, branch] of branches.entries()) {
      for (let daysAgo = 179; daysAgo >= 0; daysAgo--) {
        const date = new Date(today.getTime() - daysAgo * DAY_MS);
        const weekday = date.getUTCDay();
        const season = 1 + Math.sin((daysAgo / 180) * Math.PI * 2) * 0.12;
        const weekendBoost = weekday === 0 || weekday === 6 ? 1.35 : 1;
        const totalBookings = Math.max(3, Math.round((8 + ((daysAgo + branchIndex * 3) % 11)) * weekendBoost));
        const cancelledBookings = (daysAgo + branchIndex) % 13 === 0 ? 2 : (daysAgo + branchIndex) % 7 === 0 ? 1 : 0;
        const noShowBookings = (daysAgo + branchIndex * 2) % 29 === 0 ? 1 : 0;
        const completedBookings = Math.max(0, totalBookings - cancelledBookings - noShowBookings);
        const averageTicket = 720000 + branchIndex * 45000 + ((daysAgo * 17000) % 280000);
        rows.push(
          this.aggregateRepo.create({
            branchId: branch.id,
            aggregateDate: date.toISOString().slice(0, 10),
            totalBookings,
            completedBookings,
            cancelledBookings,
            noShowBookings,
            totalRevenue: Math.round(completedBookings * averageTicket * season),
            avgServiceDurationMinutes: 60 + ((daysAgo + branchIndex) % 4) * 15,
            newCustomers: (daysAgo + branchIndex) % 4,
          }),
        );
      }
    }
    await this.aggregateRepo.save(rows, { chunk: 200 });
  }
}

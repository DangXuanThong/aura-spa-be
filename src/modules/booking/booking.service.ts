import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { vietnamDate } from 'src/common/utils/vietnam-date';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { BookingService as BookingServiceEntity } from './entities/booking-service.entity';
import { BookingSlotConfig } from './entities/booking-slot-config.entity';
import { BranchService as BranchServiceEntity } from 'src/modules/branch-service/entities/branch-service.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { StaffSchedule } from 'src/modules/schedule/entities/staff-schedule.entity';
import { ScheduleRequest } from 'src/modules/schedule/entities/schedule-request.entity';
import { ApprovalStatus } from 'src/modules/schedule/enums/approval-status.enum';
import { ScheduleRequestType } from 'src/modules/schedule/enums/schedule-request-type.enum';
import { BookingStatus } from './enums/booking-status.enum';
import { BookingSource } from './enums/booking-source.enum';
import { BranchStatus } from 'src/modules/branch/enums/branch-status.enum';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { StaffPosition } from 'src/modules/branch/enums/staff-position.enum';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { TransferBookingDto } from './dto/transfer-booking.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { CreateWalkInBookingDto } from './dto/create-walk-in-booking.dto';
import { ReassignTechnicianDto } from './dto/reassign-technician.dto';
import { DiscountCode } from 'src/modules/promotion/entities/discount-code.entity';
import { Promotion } from 'src/modules/promotion/entities/promotion.entity';
import { DiscountCodeStatus } from 'src/modules/promotion/enums/discount-code-status.enum';
import { DiscountType } from 'src/modules/promotion/enums/discount-type.enum';
import { PromotionStatus } from 'src/modules/promotion/enums/promotion-status.enum';
import { User } from 'src/modules/user/entities/user.entity';
import { UserService } from 'src/modules/user/user.service';
import { UserStatus } from 'src/modules/user/enums/user-status.enum';
import { AuthProvider } from 'src/modules/user/enums/auth-provider.enum';
import { Gender } from 'src/modules/user/enums/gender.enum';
import { Invoice } from 'src/modules/payment/entities/invoice.entity';
import { Payment } from 'src/modules/payment/entities/payment.entity';
import { InvoiceStatus } from 'src/modules/payment/enums/invoice-status.enum';
import { PaymentStatus } from 'src/modules/payment/enums/payment-status.enum';
import { BOOKING_EVENTS } from 'src/common/constants/events';
import { SepayConfig } from 'src/modules/payment/infrastructure/sepay/sepay.config';
import { TreatmentCourse } from 'src/modules/treatment/entities/treatment-course.entity';
import { TreatmentSession } from 'src/modules/treatment/entities/treatment-session.entity';
import { TreatmentCourseStatus } from 'src/modules/treatment/enums/treatment-course-status.enum';
import { TreatmentSessionStatus } from 'src/modules/treatment/enums/treatment-session-status.enum';
import { LoyaltyAccount } from 'src/modules/loyalty/entities/loyalty-account.entity';

const ACTIVE_BOOKING_STATUSES = [BookingStatus.PendingPayment, BookingStatus.Confirmed, BookingStatus.CheckedIn, BookingStatus.InService];
const ROOM_OCCUPYING_STATUSES = [BookingStatus.Confirmed, BookingStatus.CheckedIn, BookingStatus.InService];
const CUSTOMER_TIER_ORDER = ['Aura Member', 'Aura Gold', 'Aura Platinum'];

function normalizeVietnamPhone(phone: string): string {
  const compact = phone.replace(/[^\d+]/g, '');
  if (/^\+84\d{9}$/.test(compact)) return `0${compact.slice(3)}`;
  if (/^84\d{9}$/.test(compact)) return `0${compact.slice(2)}`;
  return compact;
}

@Injectable()
export class BookingService {
  constructor(
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingServiceEntity)
    private readonly bookingServiceRepo: Repository<BookingServiceEntity>,
    @InjectRepository(BookingSlotConfig)
    private readonly slotConfigRepo: Repository<BookingSlotConfig>,
    @InjectRepository(BranchServiceEntity)
    private readonly branchServiceRepo: Repository<BranchServiceEntity>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(BranchStaff)
    private readonly branchStaffRepo: Repository<BranchStaff>,
    @InjectRepository(StaffSchedule)
    private readonly staffScheduleRepo: Repository<StaffSchedule>,
    @InjectRepository(ScheduleRequest)
    private readonly scheduleRequestRepo: Repository<ScheduleRequest>,
    @InjectRepository(DiscountCode)
    private readonly discountCodeRepo: Repository<DiscountCode>,
    @InjectRepository(Promotion)
    private readonly promotionRepo: Repository<Promotion>,
    @InjectRepository(LoyaltyAccount)
    private readonly loyaltyAccountRepo: Repository<LoyaltyAccount>,
    private readonly userService: UserService,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  // UC10 — Book Appointment
  async create(dto: CreateBookingDto, customerId: string): Promise<Booking> {
    // 1. Validate branch is active
    const branch = await this.branchRepo.findOne({ where: { id: dto.branchId } });
    if (!branch || branch.status !== BranchStatus.Active) {
      throw new NotFoundException(`Branch ${dto.branchId} not found or inactive`);
    }

    // 2. Resolve effective price and duration from branch-service
    const branchSvc = await this.branchServiceRepo.findOne({
      where: { branchId: dto.branchId, serviceId: dto.serviceId, isEnabled: true },
      relations: ['service'],
    });
    if (!branchSvc) {
      throw new NotFoundException(`Service ${dto.serviceId} is not available at branch ${dto.branchId}`);
    }

    const durationMinutes = branchSvc.durationMinutesOverride ?? branchSvc.service!.defaultDurationMinutes;
    const unitPrice = parseFloat((branchSvc.priceOverride ?? branchSvc.service!.defaultPrice) as unknown as string);

    // 2b. Optionally validate + calculate a discount code applied at booking time (pure computation, safe outside tx)
    let discountResult: { discountCode: DiscountCode; promotion: Promotion; discountAmount: number } | null = null;
    if (dto.discountCode) {
      discountResult = await this.resolveDiscountCode(dto.discountCode, dto.branchId, customerId, unitPrice);
    }
    const discountAmount = discountResult?.discountAmount ?? 0;
    const netAmount = unitPrice - discountAmount;

    const depositPercent = this.configService.get<SepayConfig>('sepay', { infer: true })!.depositPercent;
    const depositAmount = depositPercent > 0 ? Math.round(netAmount * (depositPercent / 100)) : 0;
    const initialStatus = depositAmount > 0 ? BookingStatus.PendingPayment : BookingStatus.Confirmed;

    // 3. Compute start/end times
    const startTime = new Date(dto.startTime);
    if (isNaN(startTime.getTime()) || startTime <= new Date()) {
      throw new BadRequestException('Start time must be a valid date in the future');
    }
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    // 4. Resolve a concrete technician. If the customer chooses "any", assign the first available scheduled technician.
    const technicianId = await this.resolveTechnician(dto.branchId, dto.technicianId, startTime, endTime);

    // 5. Find slot config to check capacity
    const targetDate = vietnamDate.toDateString(startTime);
    const dayOfWeek = vietnamDate.dayOfWeek(startTime);
    await this.slotConfigRepo
      .createQueryBuilder('sc')
      .where('sc.branchId = :branchId', { branchId: dto.branchId })
      .andWhere('sc.dayOfWeek = :dayOfWeek', { dayOfWeek })
      .andWhere('sc.effectiveFrom <= :date', { date: targetDate })
      .andWhere('(sc.effectiveTo IS NULL OR sc.effectiveTo >= :date)', { date: targetDate })
      .getOne();

    // Resolve active technician count scheduled for this specific slot
    const allTechs = await this.branchStaffRepo.find({
      where: { branchId: dto.branchId, position: StaffPosition.Technician, status: StaffStatus.Active },
    });
    const techIds = allTechs.map((t) => t.userId);
    let scheduledTechCount = 0;
    if (techIds.length > 0) {
      const shifts = await this.scheduleRequestRepo
        .createQueryBuilder('sr')
        .where('sr.staffId IN (:...techIds)', { techIds })
        .andWhere('sr.branchId = :branchId', { branchId: dto.branchId })
        .andWhere('sr.requestType = :type', { type: ScheduleRequestType.WorkShift })
        .andWhere('sr.status = :status', { status: ApprovalStatus.Approved })
        .andWhere('sr.requestedStart <= :startTime', { startTime })
        .andWhere('sr.requestedEnd >= :endTime', { endTime })
        .getMany();
      scheduledTechCount = shifts.length;
    }

    // Real capacity is determined entirely by the number of active scheduled staff for this slot
    const effectiveMaxBookings = scheduledTechCount;

    // 6 + 7 + 8. Lock branch, kiểm tra slot bên trong transaction, tạo booking atomically (BUG-041)
    const booking = await this.dataSource.transaction(async (manager) => {
      // Lock row branch để serialize concurrent requests cho cùng branch.
      // Không có lock: 2 requests đọc count=0 đồng thời, cả 2 pass → overbooking.
      await manager.findOneOrFail(Branch, {
        where: { id: dto.branchId },
        lock: { mode: 'pessimistic_write' },
      });

      const overlapping = await manager
        .createQueryBuilder(Booking, 'b')
        .where('b.branchId = :branchId', { branchId: dto.branchId })
        .andWhere('b.startTime < :endTime', { endTime })
        .andWhere('b.endTime > :startTime', { startTime })
        .andWhere('b.status IN (:...active)', { active: ACTIVE_BOOKING_STATUSES })
        .getCount();

      if (overlapping >= effectiveMaxBookings) {
        throw new ConflictException('The selected time slot is no longer available. Please choose a different time.');
      }

      // Re-validate the discount code under a row lock to guard against a TOCTOU race
      // (e.g. the code hitting its usage limit between the pre-check above and now).
      let appliedDiscountCodeId: string | null = null;
      if (discountResult) {
        const lockedCode = await manager.findOne(DiscountCode, {
          where: { id: discountResult.discountCode.id },
          lock: { mode: 'pessimistic_write' },
        });
        if (!lockedCode) throw new NotFoundException(`Discount code "${dto.discountCode}" not found`);
        if (lockedCode.usageLimitTotal !== null && lockedCode.usedCount >= lockedCode.usageLimitTotal) {
          throw new BadRequestException(`Discount code "${dto.discountCode}" has reached its usage limit`);
        }
        if (discountResult.promotion.usageLimitTotal !== null) {
          const freshPromo = await manager.findOne(Promotion, { where: { id: discountResult.promotion.id } });
          if (freshPromo && freshPromo.usedCount >= discountResult.promotion.usageLimitTotal) {
            throw new BadRequestException('This promotion has reached its total usage limit');
          }
        }

        await manager.increment(DiscountCode, { id: lockedCode.id }, 'usedCount', 1);
        await manager.increment(Promotion, { id: discountResult.promotion.id }, 'usedCount', 1);
        appliedDiscountCodeId = lockedCode.id;
      }

      const created = await manager.save(
        manager.create(Booking, {
          customerId,
          branchId: dto.branchId,
          technicianId,
          discountCodeId: appliedDiscountCodeId,
          startTime,
          endTime,
          status: initialStatus,
          source: BookingSource.Online,
          subtotalAmount: unitPrice,
          discountAmount,
          depositRequiredAmount: depositAmount,
          paidAmount: 0,
          remainingAmount: netAmount,
          notes: dto.notes ?? null,
          createdBy: customerId,
        }),
      );

      await manager.save(
        manager.create(BookingServiceEntity, {
          bookingId: created.id,
          serviceId: dto.serviceId,
          quantity: 1,
          durationMinutes,
          unitPrice,
          discountAmount,
          finalAmount: netAmount,
        }),
      );

      // Link next planned treatment session if active course exists
      const activeCourse = await manager.findOne(TreatmentCourse, {
        where: {
          customerId,
          serviceId: dto.serviceId,
          status: TreatmentCourseStatus.Active,
        },
        order: { createdAt: 'ASC' },
      });
      if (activeCourse) {
        const nextSession = await manager.findOne(TreatmentSession, {
          where: {
            treatmentCourseId: activeCourse.id,
            status: TreatmentSessionStatus.Planned,
          },
          order: { sessionNumber: 'ASC' },
        });
        if (nextSession) {
          nextSession.bookingId = created.id;
          nextSession.status = TreatmentSessionStatus.Booked;
          nextSession.staffId = technicianId;
          await manager.save(TreatmentSession, nextSession);
        }
      }

      return created;
    });
    this.eventEmitter.emit(BOOKING_EVENTS.CREATED, {
      bookingId: booking.id,
      customerId: booking.customerId,
      branchId: booking.branchId,
    });
    return booking;
  }

  // UC11 — Reschedule Appointment
  async reschedule(id: string, dto: RescheduleBookingDto, customerId: string): Promise<Booking> {
    // 1. Find booking and verify ownership
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    if (booking.customerId !== customerId) throw new ForbiddenException('You do not have access to this booking');

    // 2. Only upcoming bookings can be rescheduled
    const reschedulableStatuses = [BookingStatus.PendingPayment, BookingStatus.Confirmed];
    if (!reschedulableStatuses.includes(booking.status)) {
      throw new BadRequestException('Only upcoming bookings with status pending_payment or confirmed can be rescheduled');
    }

    // 3. Existing and new appointment times must both still be in the future
    if (new Date() >= booking.startTime) {
      throw new BadRequestException('Cannot reschedule a booking that has already started');
    }

    const newStartTime = new Date(dto.startTime);
    if (newStartTime <= new Date()) {
      throw new BadRequestException('New start time must be in the future');
    }

    // 4. Fetch booking-service record to carry over duration and pricing
    const bookingSvc = await this.bookingServiceRepo.findOne({ where: { bookingId: id } });
    if (!bookingSvc) throw new NotFoundException('Booking service record not found');

    const newEndTime = new Date(newStartTime.getTime() + bookingSvc.durationMinutes * 60 * 1000);

    // 5. Validate new technician if provided (must be active staff at same branch)
    const newTechnicianId = await this.resolveTechnician(booking.branchId, dto.technicianId, new Date(dto.startTime), newEndTime);

    // 6. Find slot config for the new date
    const targetDate = vietnamDate.toDateString(newStartTime);
    const dayOfWeek = vietnamDate.dayOfWeek(newStartTime);
    const slotConfig = await this.slotConfigRepo
      .createQueryBuilder('sc')
      .where('sc.branchId = :branchId', { branchId: booking.branchId })
      .andWhere('sc.dayOfWeek = :dayOfWeek', { dayOfWeek })
      .andWhere('sc.effectiveFrom <= :date', { date: targetDate })
      .andWhere('(sc.effectiveTo IS NULL OR sc.effectiveTo >= :date)', { date: targetDate })
      .getOne();
    const maxBookings = slotConfig?.maxBookings ?? 1;

    // 7. Check slot availability at the new time, excluding the booking being rescheduled
    const overlapping = await this.bookingRepo
      .createQueryBuilder('b')
      .where('b.branchId = :branchId', { branchId: booking.branchId })
      .andWhere('b.startTime < :endTime', { endTime: newEndTime })
      .andWhere('b.endTime > :startTime', { startTime: newStartTime })
      .andWhere('b.status IN (:...active)', { active: ACTIVE_BOOKING_STATUSES })
      .andWhere('b.id != :id', { id })
      .getCount();

    if (overlapping >= maxBookings) {
      throw new ConflictException('The selected time slot is not available. Please choose a different time.');
    }

    // 8-10. Mark old as rescheduled, create new booking and service record atomically
    const newBooking = await this.dataSource.transaction(async (manager) => {
      await manager.update(Booking, id, { status: BookingStatus.Rescheduled });

      const newBooking = await manager.save(
        manager.create(Booking, {
          customerId,
          branchId: booking.branchId,
          technicianId: newTechnicianId,
          discountCodeId: booking.discountCodeId,
          startTime: newStartTime,
          endTime: newEndTime,
          status: booking.status,
          source: booking.source,
          subtotalAmount: booking.subtotalAmount,
          discountAmount: booking.discountAmount,
          depositRequiredAmount: booking.depositRequiredAmount,
          paidAmount: booking.paidAmount,
          remainingAmount: booking.remainingAmount,
          notes: booking.notes,
          rescheduledFromBookingId: id,
          createdBy: customerId,
        }),
      );

      await manager.save(
        manager.create(BookingServiceEntity, {
          bookingId: newBooking.id,
          serviceId: bookingSvc.serviceId,
          quantity: bookingSvc.quantity,
          durationMinutes: bookingSvc.durationMinutes,
          unitPrice: bookingSvc.unitPrice,
          discountAmount: bookingSvc.discountAmount,
          finalAmount: bookingSvc.finalAmount,
        }),
      );

      await manager.update(TreatmentSession, { bookingId: id }, { bookingId: newBooking.id, staffId: newTechnicianId });

      // The rescheduled booking counts as a fresh usage of the discount code
      if (booking.discountCodeId) {
        await manager.increment(DiscountCode, { id: booking.discountCodeId }, 'usedCount', 1);
        const dc = await manager.findOne(DiscountCode, { where: { id: booking.discountCodeId } });
        if (dc?.promotionId) {
          await manager.increment(Promotion, { id: dc.promotionId }, 'usedCount', 1);
        }
      }

      return newBooking;
    });

    this.eventEmitter.emit(BOOKING_EVENTS.RESCHEDULED, {
      bookingId: newBooking.id,
      previousBookingId: booking.id,
      customerId: newBooking.customerId,
      branchId: newBooking.branchId,
      startTime: newBooking.startTime,
      endTime: newBooking.endTime,
    });

    return newBooking;
  }

  // UC13 — Transfer Appointment to Another Branch
  async transfer(id: string, dto: TransferBookingDto, customerId: string): Promise<Booking> {
    // 1. Find booking and verify ownership
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    if (booking.customerId !== customerId) throw new ForbiddenException('You do not have access to this booking');

    // 2. Only confirmed bookings can be transferred
    if (booking.status !== BookingStatus.Confirmed) {
      throw new BadRequestException('Only confirmed bookings can be transferred');
    }

    // 3. New start time must be in the future
    const newStartTime = new Date(dto.startTime);
    if (newStartTime <= new Date()) {
      throw new BadRequestException('New start time must be in the future');
    }

    // 4. Target branch must differ from current branch
    if (dto.targetBranchId === booking.branchId) {
      throw new BadRequestException('Target branch must be different from the current branch');
    }

    // 5. Verify target branch is active
    const targetBranch = await this.branchRepo.findOne({ where: { id: dto.targetBranchId } });
    if (!targetBranch || targetBranch.status !== BranchStatus.Active) {
      throw new NotFoundException(`Branch ${dto.targetBranchId} not found or inactive`);
    }

    // 6. Fetch original booking-service to get the serviceId being transferred
    const bookingSvc = await this.bookingServiceRepo.findOne({ where: { bookingId: id } });
    if (!bookingSvc) throw new NotFoundException('Booking service record not found');

    // 7. Verify service is available at target branch and resolve new price/duration
    const targetBranchSvc = await this.branchServiceRepo.findOne({
      where: { branchId: dto.targetBranchId, serviceId: bookingSvc.serviceId, isEnabled: true },
      relations: ['service'],
    });
    if (!targetBranchSvc) {
      throw new NotFoundException(`Service is not available at the target branch ${dto.targetBranchId}`);
    }

    const newDuration = targetBranchSvc.durationMinutesOverride ?? targetBranchSvc.service!.defaultDurationMinutes;
    const newUnitPrice = parseFloat((targetBranchSvc.priceOverride ?? targetBranchSvc.service!.defaultPrice) as unknown as string);
    const newEndTime = new Date(newStartTime.getTime() + newDuration * 60 * 1000);

    // 8. Validate technician at target branch if provided
    if (dto.technicianId) {
      await this.resolveTechnician(dto.targetBranchId, dto.technicianId, newStartTime, newEndTime);
    }

    // 9. Find slot config at target branch for the new date
    const targetDate = vietnamDate.toDateString(newStartTime);
    const dayOfWeek = vietnamDate.dayOfWeek(newStartTime);
    const slotConfig = await this.slotConfigRepo
      .createQueryBuilder('sc')
      .where('sc.branchId = :branchId', { branchId: dto.targetBranchId })
      .andWhere('sc.dayOfWeek = :dayOfWeek', { dayOfWeek })
      .andWhere('sc.effectiveFrom <= :date', { date: targetDate })
      .andWhere('(sc.effectiveTo IS NULL OR sc.effectiveTo >= :date)', { date: targetDate })
      .getOne();
    const maxBookings = slotConfig?.maxBookings ?? 1;

    // 10. Check slot availability at the target branch and new time
    const overlapping = await this.bookingRepo
      .createQueryBuilder('b')
      .where('b.branchId = :branchId', { branchId: dto.targetBranchId })
      .andWhere('b.startTime < :endTime', { endTime: newEndTime })
      .andWhere('b.endTime > :startTime', { startTime: newStartTime })
      .andWhere('b.status IN (:...active)', { active: ACTIVE_BOOKING_STATUSES })
      .getCount();

    if (overlapping >= maxBookings) {
      throw new ConflictException('The selected time slot is not available at the target branch. Please choose a different time.');
    }

    // 11-13. Mark old as transferred, create new booking and service record atomically
    const paidAmount = parseFloat(booking.paidAmount as unknown as string);
    const discountAmount = parseFloat(booking.discountAmount as unknown as string);
    const newRemainingAmount = Math.max(0, newUnitPrice - discountAmount - paidAmount);

    const newBooking = await this.dataSource.transaction(async (manager) => {
      await manager.update(Booking, id, { status: BookingStatus.Transferred });

      const newBooking = await manager.save(
        manager.create(Booking, {
          customerId,
          branchId: dto.targetBranchId,
          technicianId: dto.technicianId ?? null,
          discountCodeId: booking.discountCodeId,
          startTime: newStartTime,
          endTime: newEndTime,
          status: BookingStatus.Confirmed,
          source: booking.source,
          subtotalAmount: newUnitPrice,
          discountAmount,
          depositRequiredAmount: booking.depositRequiredAmount,
          paidAmount,
          remainingAmount: newRemainingAmount,
          notes: booking.notes,
          transferredFromBranchId: booking.branchId,
          createdBy: customerId,
        }),
      );

      await manager.save(
        manager.create(BookingServiceEntity, {
          bookingId: newBooking.id,
          serviceId: bookingSvc.serviceId,
          quantity: bookingSvc.quantity,
          durationMinutes: newDuration,
          unitPrice: newUnitPrice,
          discountAmount: bookingSvc.discountAmount,
          finalAmount: newUnitPrice - parseFloat(bookingSvc.discountAmount as unknown as string),
        }),
      );

      await manager.update(TreatmentSession, { bookingId: id }, { bookingId: newBooking.id, staffId: dto.technicianId ?? null });

      return newBooking;
    });

    this.eventEmitter.emit(BOOKING_EVENTS.TRANSFERRED, {
      bookingId: newBooking.id,
      previousBookingId: booking.id,
      customerId: newBooking.customerId,
      sourceBranchId: booking.branchId,
      targetBranchId: newBooking.branchId,
      startTime: newBooking.startTime,
      endTime: newBooking.endTime,
    });

    return newBooking;
  }

  // UC12 — Cancel Appointment
  async cancel(id: string, dto: CancelBookingDto, customerId: string): Promise<Booking> {
    // 1. Find booking and verify ownership
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    if (booking.customerId !== customerId) throw new ForbiddenException('You do not have access to this booking');

    // 2. Only upcoming bookings can be cancelled
    const cancellableStatuses = [BookingStatus.PendingPayment, BookingStatus.Confirmed];
    if (!cancellableStatuses.includes(booking.status)) {
      throw new BadRequestException('Only upcoming bookings with status pending_payment or confirmed can be cancelled');
    }

    // 3. Must cancel before the scheduled start time
    if (new Date() >= booking.startTime) {
      throw new BadRequestException('Cannot cancel a booking that has already started');
    }

    // 4. Apply cancellation atomically — booking + any non-terminal invoice must be updated together
    await this.dataSource.transaction(async (manager) => {
      await manager.update(Booking, id, {
        status: BookingStatus.Cancelled,
        cancelReason: dto.cancelReason ?? null,
        cancelledAt: new Date(),
      });

      await manager.update(TreatmentSession, { bookingId: id }, { status: TreatmentSessionStatus.Planned, bookingId: null, staffId: null });

      const invoice = await manager.findOne(Invoice, { where: { bookingId: id } });
      if (invoice) {
        if ([InvoiceStatus.Draft, InvoiceStatus.Issued].includes(invoice.status)) {
          await manager.update(Invoice, invoice.id, { status: InvoiceStatus.Voided });
        } else if ([InvoiceStatus.PartiallyPaid, InvoiceStatus.Paid].includes(invoice.status)) {
          // Deposit already paid — mark invoice and outstanding payments for refund
          await manager.update(Invoice, invoice.id, { status: InvoiceStatus.Refunded });
          await manager.update(
            Payment,
            { invoiceId: invoice.id, status: In([PaymentStatus.Paid, PaymentStatus.PartiallyRefunded]) },
            { status: PaymentStatus.Refunded, refundReason: 'Booking cancelled by customer' },
          );
        }
      }
    });

    const cancelled = (await this.bookingRepo.findOne({ where: { id } })) as Booking;

    this.eventEmitter.emit(BOOKING_EVENTS.CANCELLED, {
      bookingId: cancelled.id,
      customerId: cancelled.customerId,
      branchId: cancelled.branchId,
      reason: cancelled.cancelReason ?? undefined,
    });

    return cancelled;
  }

  // UC18 — Check In Customer
  async checkIn(id: string, staffId: string): Promise<Booking> {
    // 1. Find booking
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);

    // 2. Only confirmed bookings can be checked in
    if (booking.status !== BookingStatus.Confirmed) {
      throw new BadRequestException('Only confirmed bookings can be checked in');
    }

    if (new Date() < booking.startTime) {
      throw new BadRequestException('Cannot check in before the booking start time');
    }

    if (!booking.room) {
      throw new BadRequestException('Room must be assigned before check-in');
    }

    // 3. Staff must be active at the booking branch
    const assignment = await this.branchStaffRepo.findOne({
      where: { userId: staffId, branchId: booking.branchId, status: StaffStatus.Active },
    });
    if (!assignment) {
      throw new ForbiddenException('You are not an active staff member at this branch');
    }

    await this.ensureRoomAvailable(booking, booking.room);

    // 4. Mark as checked in
    await this.bookingRepo.update(id, {
      status: BookingStatus.CheckedIn,
      checkedInAt: new Date(),
    });

    return this.bookingRepo.findOne({ where: { id } }) as Promise<Booking>;
  }
  async completeService(id: string, staffId: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);

    if (![BookingStatus.CheckedIn, BookingStatus.InService].includes(booking.status)) {
      throw new BadRequestException('Only checked-in or in-service bookings can be marked as service completed');
    }

    const assignment = await this.branchStaffRepo.findOne({
      where: { userId: staffId, branchId: booking.branchId, status: StaffStatus.Active },
    });
    if (!assignment) {
      throw new ForbiddenException(`Staff ${staffId} is not an active staff member at this branch`);
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Booking, { id }, { status: BookingStatus.ServiceCompleted, room: null });

      const session = await manager.findOne(TreatmentSession, {
        where: { bookingId: id },
        relations: ['treatmentCourse'],
      });

      if (!session || session.status === TreatmentSessionStatus.Completed) return;

      session.status = TreatmentSessionStatus.Completed;
      session.staffId = staffId;
      session.completedAt = new Date();
      if (!session.progressNote) {
        session.progressNote = 'Buổi trị liệu đã hoàn thành. Hệ thống đã cập nhật tiến độ liệu trình và chuyển lịch sang chờ thanh toán.';
      }
      await manager.save(TreatmentSession, session);

      const course = session.treatmentCourse ?? await manager.findOne(TreatmentCourse, { where: { id: session.treatmentCourseId } });
      if (!course) return;

      const completedSessions = await manager.count(TreatmentSession, {
        where: {
          treatmentCourseId: course.id,
          status: TreatmentSessionStatus.Completed,
        },
      });
      const remainingSessions = Math.max(course.totalSessions - completedSessions, 0);

      course.usedSessions = completedSessions;
      course.remainingSessions = remainingSessions;
      if (remainingSessions === 0) {
        course.status = TreatmentCourseStatus.Completed;
      }
      await manager.save(TreatmentCourse, course);
    });

    return this.bookingRepo.findOne({ where: { id } }) as Promise<Booking>;
  }

  // UC19 — Create Walk-in Appointment
  async createWalkIn(dto: CreateWalkInBookingDto, staffId: string): Promise<Booking> {
    // 1. Staff must be active at the specified branch
    const staffAssignment = await this.branchStaffRepo.findOne({
      where: { userId: staffId, branchId: dto.branchId, status: StaffStatus.Active },
    });
    if (!staffAssignment) {
      throw new ForbiddenException('You are not an active staff member at this branch');
    }

    // 2. Branch must be active
    const branch = await this.branchRepo.findOne({ where: { id: dto.branchId } });
    if (!branch || branch.status !== BranchStatus.Active) {
      throw new NotFoundException(`Branch ${dto.branchId} not found or inactive`);
    }

    // 2a. Resolve customer by id or quick-create from walk-in phone/name
    // BUG-044: user creation moved inside transaction — không tạo User ngoài tx nữa
    let customerId: string | undefined = dto.customerId;
    let needsNewCustomer = false;
    let newCustomerName = '';
    let newCustomerPhone = '';

    if (customerId) {
      const customer = await this.userService.findById(customerId);
      if (!customer || customer.role !== UserRole.Customer || customer.status !== UserStatus.Active) {
        throw new NotFoundException(`Customer ${customerId} not found or inactive`);
      }
    } else {
      const customerName = dto.customerName?.trim() ?? '';
      const customerPhone = dto.customerPhone ? normalizeVietnamPhone(dto.customerPhone) : '';

      if (!customerName || !customerPhone) {
        throw new BadRequestException('customerId or both customerName and customerPhone are required for walk-in booking');
      }

      if (!/^(0)[0-9]{9}$/.test(customerPhone)) {
        throw new BadRequestException('Customer phone must be a valid Vietnamese phone number');
      }

      const existingCustomer = await this.userService.findByPhone(customerPhone);
      if (existingCustomer) {
        if (existingCustomer.role !== UserRole.Customer) {
          this.eventEmitter.emit(BOOKING_EVENTS.WALK_IN_PHONE_CONFLICT, {
            branchId: dto.branchId,
            staffId,
            customerName,
            customerPhone,
            conflictingUserId: existingCustomer.id,
            conflictingRole: existingCustomer.role,
            conflictingStatus: existingCustomer.status,
            reason: 'internal_account',
          });
          throw new BadRequestException('So dien thoai nay dang thuoc tai khoan noi bo. Vui long dung so khac.');
        }
        if (existingCustomer.status !== UserStatus.Active) {
          this.eventEmitter.emit(BOOKING_EVENTS.WALK_IN_PHONE_CONFLICT, {
            branchId: dto.branchId,
            staffId,
            customerName,
            customerPhone,
            conflictingUserId: existingCustomer.id,
            conflictingRole: existingCustomer.role,
            conflictingStatus: existingCustomer.status,
            reason: 'inactive_customer',
          });
          throw new BadRequestException('Tai khoan khach hang dung so dien thoai nay dang bi khoa hoac chua hoat dong.');
        }
        customerId = existingCustomer.id;
      } else {
        // Defer tạo user vào trong transaction — User và Booking commit/rollback cùng nhau (BUG-044)
        needsNewCustomer = true;
        newCustomerName = customerName;
        newCustomerPhone = customerPhone;
      }
    }

    // 3. Resolve effective price and duration from branch-service
    const branchSvc = await this.branchServiceRepo.findOne({
      where: { branchId: dto.branchId, serviceId: dto.serviceId, isEnabled: true },
      relations: ['service'],
    });
    if (!branchSvc) {
      throw new NotFoundException(`Service ${dto.serviceId} is not available at branch ${dto.branchId}`);
    }

    const durationMinutes = branchSvc.durationMinutesOverride ?? branchSvc.service!.defaultDurationMinutes;
    const unitPrice = parseFloat((branchSvc.priceOverride ?? branchSvc.service!.defaultPrice) as unknown as string);

    // 4. Validate technician (if provided)
    if (dto.technicianId) {
      const techAssignment = await this.branchStaffRepo.findOne({
        where: { branchId: dto.branchId, userId: dto.technicianId, status: StaffStatus.Active },
      });
      if (!techAssignment) {
        throw new NotFoundException(`Technician ${dto.technicianId} is not an active staff member at branch ${dto.branchId}`);
      }
    }

    // 5. Start time must be today (same-day walk-in)
    const startTime = new Date(dto.startTime);
    const nowDate = vietnamDate.toDateString(new Date());
    const slotDate = vietnamDate.toDateString(startTime);
    if (slotDate !== nowDate) {
      throw new BadRequestException('Walk-in appointments must be scheduled for today');
    }

    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    // 5a. Verify technician has an approved working shift covering this slot
    if (dto.technicianId) {
      await this.resolveTechnician(dto.branchId, dto.technicianId, startTime, endTime);
    }

    // 6. Đọc slot config (read-only, an toàn ngoài transaction)
    const dayOfWeek = vietnamDate.dayOfWeek(startTime);
    const slotConfig = await this.slotConfigRepo
      .createQueryBuilder('sc')
      .where('sc.branchId = :branchId', { branchId: dto.branchId })
      .andWhere('sc.dayOfWeek = :dayOfWeek', { dayOfWeek })
      .andWhere('sc.effectiveFrom <= :date', { date: slotDate })
      .andWhere('(sc.effectiveTo IS NULL OR sc.effectiveTo >= :date)', { date: slotDate })
      .getOne();

    const maxBookings = slotConfig?.maxBookings ?? 1;

    // 7 + 8. Lock branch, tạo customer mới (nếu cần), kiểm tra slot, tạo booking atomically (BUG-041 + BUG-044)
    return this.dataSource.transaction(async (manager) => {
      // Lock row branch để serialize concurrent booking creation cho cùng branch (BUG-041)
      await manager.findOneOrFail(Branch, {
        where: { id: dto.branchId },
        lock: { mode: 'pessimistic_write' },
      });

      const overlapping = await manager
        .createQueryBuilder(Booking, 'b')
        .where('b.branchId = :branchId', { branchId: dto.branchId })
        .andWhere('b.startTime < :endTime', { endTime })
        .andWhere('b.endTime > :startTime', { startTime })
        .andWhere('b.status IN (:...active)', { active: ACTIVE_BOOKING_STATUSES })
        .getCount();

      if (overlapping >= maxBookings) {
        throw new ConflictException('The selected time slot is fully booked. Please choose a different time.');
      }

      // Tạo customer mới bên trong transaction — User và Booking commit/rollback cùng nhau (BUG-044)
      if (needsNewCustomer) {
        const newUser = await manager.save(
          manager.create(User, {
            fullName: newCustomerName,
            phone: newCustomerPhone,
            email: null,
            passwordHash: null,
            // Walk-in stubs have no credentials (passwordHash null, email null) — cannot authenticate
            authProvider: AuthProvider.Email,
            status: UserStatus.Active,
            isActive: false,
            role: UserRole.Customer,
            gender: Gender.Unknown,
            dateOfBirth: null,
            address: null,
          }),
        );
        customerId = newUser.id;
      }

      const booking = await manager.save(
        manager.create(Booking, {
          customerId: customerId!,
          branchId: dto.branchId,
          technicianId: dto.technicianId ?? null,
          startTime,
          endTime,
          status: BookingStatus.CheckedIn,
          source: BookingSource.WalkIn,
          subtotalAmount: unitPrice,
          discountAmount: 0,
          depositRequiredAmount: 0,
          paidAmount: 0,
          remainingAmount: unitPrice,
          notes: dto.notes ?? null,
          checkedInAt: new Date(),
          createdBy: staffId,
        }),
      );

      await manager.save(
        manager.create(BookingServiceEntity, {
          bookingId: booking.id,
          serviceId: dto.serviceId,
          quantity: 1,
          durationMinutes,
          unitPrice,
          discountAmount: 0,
          finalAmount: unitPrice,
        }),
      );

      // Link next planned treatment session if active course exists
      const activeCourse = await manager.findOne(TreatmentCourse, {
        where: {
          customerId: customerId!,
          serviceId: dto.serviceId,
          status: TreatmentCourseStatus.Active,
        },
        order: { createdAt: 'ASC' },
      });
      if (activeCourse) {
        const nextSession = await manager.findOne(TreatmentSession, {
          where: {
            treatmentCourseId: activeCourse.id,
            status: TreatmentSessionStatus.Planned,
          },
          order: { sessionNumber: 'ASC' },
        });
        if (nextSession) {
          nextSession.bookingId = booking.id;
          nextSession.status = TreatmentSessionStatus.Booked;
          nextSession.staffId = dto.technicianId ?? null;
          await manager.save(TreatmentSession, nextSession);
        }
      }

      return booking;
    });
  }

  // Shared discount/promotion validation + calculation used both at booking creation time and via UC14 (apply to an existing booking).
  // This is a read-only, pre-check computation; callers are responsible for re-checking usage limits
  // under a row lock inside their own transaction before committing.
  private async resolveDiscountCode(
    code: string,
    branchId: string,
    customerId: string,
    subtotal: number,
    excludeBookingId?: string,
  ): Promise<{ discountCode: DiscountCode; promotion: Promotion; discountAmount: number }> {
    // Look up discount code with its parent promotion
    const discountCode = await this.discountCodeRepo.findOne({
      where: { code },
      relations: ['promotion'],
    });
    if (!discountCode) throw new NotFoundException(`Discount code "${code}" not found`);

    const promotion = discountCode.promotion!;

    // Validate discount code status
    if (discountCode.status !== DiscountCodeStatus.Active) {
      throw new BadRequestException(`Discount code "${code}" is not active`);
    }

    // Validate promotion is active and within date range
    const now = new Date();
    if (promotion.status !== PromotionStatus.Active || now < promotion.startsAt || now > promotion.endsAt) {
      throw new BadRequestException(`Promotion associated with code "${code}" is not currently active`);
    }

    // Validate branch restriction (null = system-wide)
    if (promotion.branchId && promotion.branchId !== branchId) {
      throw new BadRequestException('This discount code is not valid at this branch');
    }

    await this.assertCustomerPromotionEligibility(promotion, customerId, excludeBookingId);

    // Check per-customer usage limit (read-only, pre-check)
    if (discountCode.usageLimitPerCustomer !== null) {
      const customerUses = await this.bookingRepo.count({ where: { customerId, discountCodeId: discountCode.id } });
      if (customerUses >= discountCode.usageLimitPerCustomer) {
        throw new BadRequestException('You have already used this discount code the maximum number of times');
      }
    }

    // Check minimum order amount
    if (promotion.minOrderAmount !== null) {
      const minOrder = parseFloat(promotion.minOrderAmount as unknown as string);
      if (subtotal < minOrder) {
        throw new BadRequestException(`Order total must be at least ${minOrder} to use this discount code`);
      }
    }

    // Calculate discount amount (pure computation, safe outside tx)
    const discountValue = parseFloat(promotion.discountValue as unknown as string);
    let discountAmount: number;
    if (promotion.discountType === DiscountType.FixedAmount) {
      discountAmount = Math.min(discountValue, subtotal);
    } else {
      discountAmount = (subtotal * discountValue) / 100;
      if (promotion.maxDiscountAmount !== null) {
        discountAmount = Math.min(discountAmount, parseFloat(promotion.maxDiscountAmount as unknown as string));
      }
    }
    discountAmount = Math.round(discountAmount * 100) / 100;

    return { discountCode, promotion, discountAmount };
  }

  private async assertCustomerPromotionEligibility(promotion: Promotion, customerId: string, excludeBookingId?: string): Promise<void> {
    const hasTierRule = Boolean(promotion.eligibleCustomerTier);
    const hasPointRule = promotion.minPointsBalance !== null && promotion.minPointsBalance !== undefined;

    if (hasTierRule || hasPointRule) {
      const account = await this.loyaltyAccountRepo.findOne({ where: { customerId } });
      const customerTier = account?.tier ?? 'Aura Member';
      const customerPoints = account?.pointsBalance ?? 0;

      if (promotion.eligibleCustomerTier && !this.isTierAtLeast(customerTier, promotion.eligibleCustomerTier)) {
        throw new BadRequestException(`This discount code is only available for ${promotion.eligibleCustomerTier} members or higher`);
      }

      const requiredPoints = promotion.minPointsBalance ?? 0;
      if (requiredPoints > 0 && customerPoints < requiredPoints) {
        throw new BadRequestException(`You need at least ${requiredPoints} loyalty points to use this discount code`);
      }
    }

    if (promotion.firstBookingOnly) {
      const query = this.bookingRepo
        .createQueryBuilder('booking')
        .where('booking.customerId = :customerId', { customerId })
        .andWhere('booking.status NOT IN (:...excludedStatuses)', {
          excludedStatuses: [BookingStatus.Cancelled, BookingStatus.Rescheduled],
        });

      if (excludeBookingId) {
        query.andWhere('booking.id != :excludeBookingId', { excludeBookingId });
      }

      const previousBookings = await query.getCount();
      if (previousBookings > 0) {
        throw new BadRequestException('This discount code is only available for first-time customers');
      }
    }
  }

  private isTierAtLeast(customerTier: string, requiredTier: string): boolean {
    const customerRank = CUSTOMER_TIER_ORDER.indexOf(customerTier);
    const requiredRank = CUSTOMER_TIER_ORDER.indexOf(requiredTier);
    if (requiredRank === -1) return true;
    if (customerRank === -1) return false;
    return customerRank >= requiredRank;
  }

  // UC14 — Apply Discount Code
  async applyDiscount(id: string, dto: ApplyDiscountDto, customerId: string): Promise<Booking> {
    // 1. Find booking and verify ownership
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    if (booking.customerId !== customerId) throw new ForbiddenException('You do not have access to this booking');

    // 2. Only upcoming bookings can receive a discount
    const eligibleStatuses = [BookingStatus.PendingPayment, BookingStatus.Confirmed];
    if (!eligibleStatuses.includes(booking.status)) {
      throw new BadRequestException('Discount codes can only be applied to upcoming bookings');
    }

    // 3. Prevent applying a second discount (fast path — re-checked under lock)
    if (booking.discountCodeId) {
      throw new BadRequestException('A discount code has already been applied to this booking');
    }

    // 4-12. Look up + validate discount code/promotion and compute the discount amount
    const subtotal = parseFloat(booking.subtotalAmount as unknown as string);
    const { discountCode, promotion, discountAmount } = await this.resolveDiscountCode(dto.code, booking.branchId, customerId, subtotal, id);

    const paidAmount = parseFloat(booking.paidAmount as unknown as string);

    // 13-14. Atomic: lock rows → re-check limits → update booking + increment counts
    await this.dataSource.transaction(async (manager) => {
      // Lock discount code to serialize concurrent apply-discount calls
      const lockedCode = await manager.findOne(DiscountCode, {
        where: { id: discountCode.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedCode) throw new NotFoundException(`Discount code "${dto.code}" not found`);

      // Re-check usage limits under lock (guards against TOCTOU race)
      if (lockedCode.usageLimitTotal !== null && lockedCode.usedCount >= lockedCode.usageLimitTotal) {
        throw new BadRequestException(`Discount code "${dto.code}" has reached its usage limit`);
      }
      if (promotion.usageLimitTotal !== null) {
        const freshPromo = await manager.findOne(Promotion, { where: { id: promotion.id } });
        if (freshPromo && freshPromo.usedCount >= promotion.usageLimitTotal) {
          throw new BadRequestException('This promotion has reached its total usage limit');
        }
      }

      // Lock booking row to prevent concurrent double-discount
      const lockedBooking = await manager.findOne(Booking, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedBooking) throw new NotFoundException(`Booking ${id} not found`);
      if (lockedBooking.discountCodeId) {
        throw new BadRequestException('A discount code has already been applied to this booking');
      }

      const newRemainingAmount = Math.max(0, subtotal - discountAmount - paidAmount);
      const depositPercent = this.configService.get<SepayConfig>('sepay', { infer: true })!.depositPercent;
      const newDepositRequiredAmount =
        lockedBooking.status === BookingStatus.PendingPayment
          ? Math.round((subtotal - discountAmount) * (depositPercent / 100))
          : lockedBooking.depositRequiredAmount;

      await manager.update(Booking, id, {
        discountCodeId: lockedCode.id,
        discountAmount,
        depositRequiredAmount: newDepositRequiredAmount,
        remainingAmount: newRemainingAmount,
      });
      await manager.increment(DiscountCode, { id: lockedCode.id }, 'usedCount', 1);
      await manager.increment(Promotion, { id: promotion.id }, 'usedCount', 1);
    });

    return this.bookingRepo.findOne({ where: { id } }) as Promise<Booking>;
  }

  // UC15 — View Booking History
  async findMyBookings(customerId: string): Promise<(Booking & { services: BookingServiceEntity[] })[]> {
    const bookings = await this.bookingRepo.find({
      where: { customerId },
      order: { startTime: 'DESC' },
      relations: ['customer', 'technician'],
    });
    return this.attachBookingDetails(bookings);
  }

  async findBranchBookings(
    branchId: string,
    requesterId: string,
    requesterRole: string,
    date?: string,
    limit = 100,
    startDate?: string,
    endDate?: string,
  ): Promise<(Booking & { services: BookingServiceEntity[] })[]> {
    if (requesterRole !== UserRole.Owner) {
      const assignment = await this.branchStaffRepo.findOne({
        where: { userId: requesterId, branchId, status: StaffStatus.Active },
      });
      if (!assignment) throw new ForbiddenException('You are not active at this branch');
    }

    const qb = this.bookingRepo
      .createQueryBuilder('b')
      .leftJoinAndSelect('b.customer', 'customer')
      .leftJoinAndSelect('b.technician', 'technician')
      .where('b.branchId = :branchId', { branchId })
      .orderBy('b.startTime', 'DESC')
      .take(limit);

    if (startDate && endDate) {
      const start = new Date(`${startDate}T00:00:00+07:00`);
      const end = new Date(`${endDate}T23:59:59.999+07:00`);
      qb.andWhere('b.startTime >= :start', { start }).andWhere('b.startTime <= :end', { end });
    } else if (date) {
      const dayStart = new Date(`${date}T00:00:00+07:00`);
      const dayEnd = new Date(`${date}T23:59:59.999+07:00`);
      qb.andWhere('b.startTime >= :dayStart', { dayStart }).andWhere('b.startTime <= :dayEnd', { dayEnd });
    }

    const bookings = await qb.getMany();
    return this.attachBookingDetails(bookings);
  }

  async findOne(
    id: string,
    requesterId: string,
    requesterRole: string,
    requesterBranchId?: string | null,
  ): Promise<Booking & { services: BookingServiceEntity[] }> {
    const booking = await this.bookingRepo.findOne({ where: { id }, relations: ['customer', 'technician'] });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);

    if (requesterRole === UserRole.Customer) {
      if (booking.customerId !== requesterId) throw new ForbiddenException('You do not have access to this booking');
    } else if (requesterRole === UserRole.Staff || requesterRole === UserRole.Manager) {
      const assignment = await this.branchStaffRepo.findOne({
        where: { userId: requesterId, branchId: booking.branchId, status: StaffStatus.Active },
      });

      if (!assignment) {
        throw new ForbiddenException('You do not have access to bookings at this branch');
      }
    }
    // Owner has no branch restriction

    const [withServices] = await this.attachBookingDetails([booking]);
    return withServices;
  }

  // UC28 — Reassign Technician
  async reassign(id: string, dto: ReassignTechnicianDto, managerId: string): Promise<Booking & { services: BookingServiceEntity[] }> {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);

    await this.assertManagerAtBranch(managerId, booking.branchId);

    const reassignableStatuses = [BookingStatus.PendingPayment, BookingStatus.Confirmed, BookingStatus.CheckedIn, BookingStatus.InService];
    if (!reassignableStatuses.includes(booking.status)) {
      throw new BadRequestException('Booking cannot be reassigned in its current status');
    }

    if (booking.technicianId && dto.newTechnicianId === booking.technicianId) {
      throw new BadRequestException('New technician is already assigned to this booking');
    }

    const assignment = await this.branchStaffRepo.findOne({
      where: { branchId: booking.branchId, userId: dto.newTechnicianId, status: StaffStatus.Active },
    });
    if (!assignment) {
      throw new NotFoundException(`Technician ${dto.newTechnicianId} is not an active staff member at this branch`);
    }

    await this.resolveTechnician(booking.branchId, dto.newTechnicianId, booking.startTime, booking.endTime);

    await this.bookingRepo.update(id, { technicianId: dto.newTechnicianId });

    const updated = (await this.bookingRepo.findOne({ where: { id } })) as Booking;
    const [withServices] = await this.attachBookingDetails([updated]);
    return withServices;
  }

  private async assertManagerAtBranch(managerId: string, branchId: string): Promise<void> {
    const assignment = await this.branchStaffRepo.findOne({
      where: { userId: managerId, branchId, status: StaffStatus.Active },
    });
    if (!assignment) throw new ForbiddenException('You are not an active manager at this branch');
  }

  private async assertTechnicianScheduled(technicianId: string, branchId: string, startTime: Date, endTime: Date): Promise<void> {
    const shiftCount = await this.scheduleRequestRepo
      .createQueryBuilder('sr')
      .where('sr.staffId = :technicianId', { technicianId })
      .andWhere('sr.branchId = :branchId', { branchId })
      .andWhere('sr.requestType = :type', { type: ScheduleRequestType.WorkShift })
      .andWhere('sr.status = :status', { status: ApprovalStatus.Approved })
      .andWhere('sr.requestedStart <= :start', { start: startTime })
      .andWhere('sr.requestedEnd >= :end', { end: endTime })
      .getCount();
    if (shiftCount === 0) {
      throw new BadRequestException('The selected technician is not scheduled to work at this time');
    }
  }

  private async resolveTechnician(branchId: string, requestedTechnicianId: string | undefined, startTime: Date, endTime: Date): Promise<string> {
    if (requestedTechnicianId) {
      const assignment = await this.branchStaffRepo.findOne({
        where: {
          branchId,
          userId: requestedTechnicianId,
          position: StaffPosition.Technician,
          status: StaffStatus.Active,
        },
      });
      if (!assignment) {
        throw new NotFoundException(`Technician ${requestedTechnicianId} is not an active technician at branch ${branchId}`);
      }

      await this.assertTechnicianScheduled(requestedTechnicianId, branchId, startTime, endTime);
      await this.assertTechnicianNotOverlapping(requestedTechnicianId, startTime, endTime);
      return requestedTechnicianId;
    }

    const technicians = await this.branchStaffRepo.find({
      where: {
        branchId,
        position: StaffPosition.Technician,
        status: StaffStatus.Active,
      },
      order: { staffCode: 'ASC' },
    });

    if (technicians.length === 0) {
      throw new ConflictException('No technician is available for the selected time slot. Please choose another time.');
    }

    const techIds = technicians.map((t) => t.userId);

    // Pre-load shifts and bookings for all technicians (BUG-046: replaces per-tech DB queries)
    const [coveredShifts, overlappingBookings] = await Promise.all([
      this.scheduleRequestRepo
        .createQueryBuilder('sr')
        .where('sr.staffId IN (:...techIds)', { techIds })
        .andWhere('sr.branchId = :branchId', { branchId })
        .andWhere('sr.requestType = :type', { type: ScheduleRequestType.WorkShift })
        .andWhere('sr.status = :status', { status: ApprovalStatus.Approved })
        .andWhere('sr.requestedStart <= :start', { start: startTime })
        .andWhere('sr.requestedEnd >= :end', { end: endTime })
        .getMany(),
      this.bookingRepo
        .createQueryBuilder('b')
        .where('b.technicianId IN (:...techIds)', { techIds })
        .andWhere('b.startTime < :endTime', { endTime })
        .andWhere('b.endTime > :startTime', { startTime })
        .andWhere('b.status IN (:...active)', { active: ACTIVE_BOOKING_STATUSES })
        .getMany(),
    ]);

    for (const technician of technicians) {
      const isScheduled = coveredShifts.some((s) => s.staffId === technician.userId);
      if (!isScheduled) continue;
      const hasOverlap = overlappingBookings.some((b) => b.technicianId === technician.userId);
      if (!hasOverlap) return technician.userId;
    }

    throw new ConflictException('No technician is available for the selected time slot. Please choose another time.');
  }

  private async assertTechnicianNotOverlapping(technicianId: string, startTime: Date, endTime: Date): Promise<void> {
    const overlapping = await this.countTechnicianOverlaps(technicianId, startTime, endTime);
    if (overlapping > 0) {
      throw new ConflictException('The selected technician already has another booking at this time');
    }
  }

  private countTechnicianOverlaps(technicianId: string, startTime: Date, endTime: Date): Promise<number> {
    return this.bookingRepo
      .createQueryBuilder('b')
      .where('b.technicianId = :technicianId', { technicianId })
      .andWhere('b.startTime < :endTime', { endTime })
      .andWhere('b.endTime > :startTime', { startTime })
      .andWhere('b.status IN (:...active)', { active: ACTIVE_BOOKING_STATUSES })
      .getCount();
  }

  private async attachBookingDetails(bookings: Booking[]): Promise<(Booking & { services: BookingServiceEntity[]; treatmentSession?: any | null })[]> {
    if (bookings.length === 0) return [];
    const ids = bookings.map((b) => b.id);
    const [allServices, treatmentSessions] = await Promise.all([
      this.bookingServiceRepo.find({
        where: { bookingId: In(ids) },
        relations: ['service'],
      }),
      this.dataSource.getRepository(TreatmentSession).find({
        where: { bookingId: In(ids) },
        relations: ['treatmentCourse'],
      }),
    ]);
    const servicesByBooking = new Map<string, BookingServiceEntity[]>();
    for (const svc of allServices) {
      const list = servicesByBooking.get(svc.bookingId) ?? [];
      list.push(svc);
      servicesByBooking.set(svc.bookingId, list);
    }
    const treatmentByBooking = new Map<string, TreatmentSession>();
    for (const session of treatmentSessions) {
      if (session.bookingId) treatmentByBooking.set(session.bookingId, session);
    }

    return bookings.map((b) => {
      const session = treatmentByBooking.get(b.id);
      const course = session?.treatmentCourse;
      return Object.assign(b, {
        services: servicesByBooking.get(b.id) ?? [],
        treatmentSession: session && course
          ? {
              id: session.id,
              treatmentCourseId: session.treatmentCourseId,
              sessionNumber: session.sessionNumber,
              totalSessions: course.totalSessions,
              usedSessions: course.usedSessions,
              remainingSessions: course.remainingSessions,
              status: session.status,
              progressNote: session.progressNote,
            }
          : null,
      });
    });
  }

  private async ensureRoomAvailable(booking: Booking, room: string): Promise<void> {
    const conflict = await this.bookingRepo
      .createQueryBuilder('booking')
      .where('booking.id != :id', { id: booking.id })
      .andWhere('booking.branchId = :branchId', { branchId: booking.branchId })
      .andWhere('booking.room = :room', { room })
      .andWhere('booking.status IN (:...statuses)', { statuses: ROOM_OCCUPYING_STATUSES })
      .andWhere('booking.startTime < :endTime', { endTime: booking.endTime })
      .andWhere('booking.endTime > :startTime', { startTime: booking.startTime })
      .getOne();

    if (conflict) {
      throw new ConflictException('Room is already assigned to another booking in this time slot');
    }
  }

  async assignRoom(
    id: string,
    room: string | null,
    requesterId: string,
    requesterRole: string,
  ): Promise<Booking & { services: BookingServiceEntity[] }> {
    const booking = await this.bookingRepo.findOne({ where: { id }, relations: ['customer', 'technician'] });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);

    if (requesterRole !== UserRole.Owner) {
      const assignment = await this.branchStaffRepo.findOne({
        where: { userId: requesterId, branchId: booking.branchId, status: StaffStatus.Active },
      });
      if (!assignment) throw new ForbiddenException('You are not active at this branch');
    }

    if (room && !ROOM_OCCUPYING_STATUSES.includes(booking.status)) {
      throw new BadRequestException('Room can only be assigned before or during service');
    }

    if (room) {
      await this.ensureRoomAvailable(booking, room);
    }

    await this.bookingRepo.update(id, { room });
    booking.room = room;

    const [withServices] = await this.attachBookingDetails([booking]);
    return withServices;
  }
}

import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { BookingService as BookingServiceEntity } from './entities/booking-service.entity';
import { BookingSlotConfig } from './entities/booking-slot-config.entity';
import { BranchService as BranchServiceEntity } from 'src/modules/branch-service/entities/branch-service.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { BookingStatus } from './enums/booking-status.enum';
import { BookingSource } from './enums/booking-source.enum';
import { BranchStatus } from 'src/modules/branch/enums/branch-status.enum';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { CreateBookingDto } from './dto/create-booking.dto';
import { RescheduleBookingDto } from './dto/reschedule-booking.dto';
import { CancelBookingDto } from './dto/cancel-booking.dto';
import { TransferBookingDto } from './dto/transfer-booking.dto';
import { ApplyDiscountDto } from './dto/apply-discount.dto';
import { DiscountCode } from 'src/modules/promotion/entities/discount-code.entity';
import { Promotion } from 'src/modules/promotion/entities/promotion.entity';
import { DiscountCodeStatus } from 'src/modules/promotion/enums/discount-code-status.enum';
import { DiscountType } from 'src/modules/promotion/enums/discount-type.enum';
import { PromotionStatus } from 'src/modules/promotion/enums/promotion-status.enum';

const ACTIVE_BOOKING_STATUSES = [BookingStatus.PendingPayment, BookingStatus.Confirmed, BookingStatus.CheckedIn, BookingStatus.InService];

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
    @InjectRepository(DiscountCode)
    private readonly discountCodeRepo: Repository<DiscountCode>,
    @InjectRepository(Promotion)
    private readonly promotionRepo: Repository<Promotion>,
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

    // 3. Validate technician belongs to this branch and is active (if provided)
    if (dto.technicianId) {
      const assignment = await this.branchStaffRepo.findOne({
        where: { branchId: dto.branchId, userId: dto.technicianId, status: StaffStatus.Active },
      });
      if (!assignment) {
        throw new NotFoundException(`Technician ${dto.technicianId} is not an active staff member at branch ${dto.branchId}`);
      }
    }

    // 4. Compute start/end times
    const startTime = new Date(dto.startTime);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    // 5. Find slot config to check capacity
    const targetDate = startTime.toISOString().slice(0, 10); // YYYY-MM-DD UTC
    const dayOfWeek = startTime.getDay();

    const slotConfig = await this.slotConfigRepo
      .createQueryBuilder('sc')
      .where('sc.branchId = :branchId', { branchId: dto.branchId })
      .andWhere('sc.dayOfWeek = :dayOfWeek', { dayOfWeek })
      .andWhere('sc.effectiveFrom <= :date', { date: targetDate })
      .andWhere('(sc.effectiveTo IS NULL OR sc.effectiveTo >= :date)', { date: targetDate })
      .getOne();

    const maxBookings = slotConfig?.maxBookings ?? 1;

    // 6. Check slot availability (prevent double-booking)
    const overlapping = await this.bookingRepo
      .createQueryBuilder('b')
      .where('b.branchId = :branchId', { branchId: dto.branchId })
      .andWhere('b.startTime < :endTime', { endTime })
      .andWhere('b.endTime > :startTime', { startTime })
      .andWhere('b.status IN (:...active)', { active: ACTIVE_BOOKING_STATUSES })
      .getCount();

    if (overlapping >= maxBookings) {
      throw new ConflictException('The selected time slot is no longer available. Please choose a different time.');
    }

    // 7. Create booking
    const booking = await this.bookingRepo.save(
      this.bookingRepo.create({
        customerId,
        branchId: dto.branchId,
        technicianId: dto.technicianId ?? null,
        startTime,
        endTime,
        status: BookingStatus.Confirmed,
        source: BookingSource.Online,
        subtotalAmount: unitPrice,
        discountAmount: 0,
        depositRequiredAmount: 0,
        paidAmount: 0,
        remainingAmount: unitPrice,
        notes: dto.notes ?? null,
        createdBy: customerId,
      }),
    );

    // 8. Create booking-service record
    await this.bookingServiceRepo.save(
      this.bookingServiceRepo.create({
        bookingId: booking.id,
        serviceId: dto.serviceId,
        quantity: 1,
        durationMinutes,
        unitPrice,
        discountAmount: 0,
        finalAmount: unitPrice,
      }),
    );

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

    // 3. New start time must be in the future
    const newStartTime = new Date(dto.startTime);
    if (newStartTime <= new Date()) {
      throw new BadRequestException('New start time must be in the future');
    }

    // 4. Fetch booking-service record to carry over duration and pricing
    const bookingSvc = await this.bookingServiceRepo.findOne({ where: { bookingId: id } });
    if (!bookingSvc) throw new NotFoundException('Booking service record not found');

    const newEndTime = new Date(newStartTime.getTime() + bookingSvc.durationMinutes * 60 * 1000);

    // 5. Validate new technician if provided (must be active staff at same branch)
    const newTechnicianId = dto.technicianId !== undefined ? dto.technicianId : booking.technicianId;
    if (dto.technicianId) {
      const assignment = await this.branchStaffRepo.findOne({
        where: { branchId: booking.branchId, userId: dto.technicianId, status: StaffStatus.Active },
      });
      if (!assignment) {
        throw new NotFoundException(`Technician ${dto.technicianId} is not an active staff member at branch ${booking.branchId}`);
      }
    }

    // 6. Find slot config for the new date
    const targetDate = newStartTime.toISOString().slice(0, 10);
    const dayOfWeek = newStartTime.getDay();
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

    // 8. Mark old booking as Rescheduled
    await this.bookingRepo.update(id, { status: BookingStatus.Rescheduled });

    // 9. Create new booking carrying over all financial state
    const newBooking = await this.bookingRepo.save(
      this.bookingRepo.create({
        customerId,
        branchId: booking.branchId,
        technicianId: newTechnicianId,
        discountCodeId: booking.discountCodeId,
        startTime: newStartTime,
        endTime: newEndTime,
        status: BookingStatus.Confirmed,
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

    // 10. Clone booking-service record for the new booking
    await this.bookingServiceRepo.save(
      this.bookingServiceRepo.create({
        bookingId: newBooking.id,
        serviceId: bookingSvc.serviceId,
        quantity: bookingSvc.quantity,
        durationMinutes: bookingSvc.durationMinutes,
        unitPrice: bookingSvc.unitPrice,
        discountAmount: bookingSvc.discountAmount,
        finalAmount: bookingSvc.finalAmount,
      }),
    );

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
      const assignment = await this.branchStaffRepo.findOne({
        where: { branchId: dto.targetBranchId, userId: dto.technicianId, status: StaffStatus.Active },
      });
      if (!assignment) {
        throw new NotFoundException(`Technician ${dto.technicianId} is not an active staff member at branch ${dto.targetBranchId}`);
      }
    }

    // 9. Find slot config at target branch for the new date
    const targetDate = newStartTime.toISOString().slice(0, 10);
    const dayOfWeek = newStartTime.getDay();
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

    // 11. Mark old booking as Transferred
    await this.bookingRepo.update(id, { status: BookingStatus.Transferred });

    // 12. Create new booking at target branch; carry over paid amount, recalculate remaining
    const paidAmount = parseFloat(booking.paidAmount as unknown as string);
    const discountAmount = parseFloat(booking.discountAmount as unknown as string);
    const newRemainingAmount = Math.max(0, newUnitPrice - discountAmount - paidAmount);

    const newBooking = await this.bookingRepo.save(
      this.bookingRepo.create({
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

    // 13. Clone booking-service record with target branch pricing
    await this.bookingServiceRepo.save(
      this.bookingServiceRepo.create({
        bookingId: newBooking.id,
        serviceId: bookingSvc.serviceId,
        quantity: bookingSvc.quantity,
        durationMinutes: newDuration,
        unitPrice: newUnitPrice,
        discountAmount: bookingSvc.discountAmount,
        finalAmount: newUnitPrice - parseFloat(bookingSvc.discountAmount as unknown as string),
      }),
    );

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

    // 4. Apply cancellation
    await this.bookingRepo.update(id, {
      status: BookingStatus.Cancelled,
      cancelReason: dto.cancelReason ?? null,
      cancelledAt: new Date(),
    });

    return this.bookingRepo.findOne({ where: { id } }) as Promise<Booking>;
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

    // 3. Prevent applying a second discount
    if (booking.discountCodeId) {
      throw new BadRequestException('A discount code has already been applied to this booking');
    }

    // 4. Look up discount code with its parent promotion
    const discountCode = await this.discountCodeRepo.findOne({
      where: { code: dto.code },
      relations: ['promotion'],
    });
    if (!discountCode) throw new NotFoundException(`Discount code "${dto.code}" not found`);

    const promotion = discountCode.promotion!;

    // 5. Validate discount code status
    if (discountCode.status !== DiscountCodeStatus.Active) {
      throw new BadRequestException(`Discount code "${dto.code}" is not active`);
    }

    // 6. Validate promotion is active and within date range
    const now = new Date();
    if (promotion.status !== PromotionStatus.Active || now < promotion.startsAt || now > promotion.endsAt) {
      throw new BadRequestException(`Promotion associated with code "${dto.code}" is not currently active`);
    }

    // 7. Validate branch restriction (null = system-wide)
    if (promotion.branchId && promotion.branchId !== booking.branchId) {
      throw new BadRequestException('This discount code is not valid at this branch');
    }

    // 8. Check total usage limit on the discount code
    if (discountCode.usageLimitTotal !== null && discountCode.usedCount >= discountCode.usageLimitTotal) {
      throw new BadRequestException(`Discount code "${dto.code}" has reached its usage limit`);
    }

    // 9. Check total usage limit on the promotion
    if (promotion.usageLimitTotal !== null && promotion.usedCount >= promotion.usageLimitTotal) {
      throw new BadRequestException('This promotion has reached its total usage limit');
    }

    // 10. Check per-customer usage limit
    if (discountCode.usageLimitPerCustomer !== null) {
      const customerUses = await this.bookingRepo.count({ where: { customerId, discountCodeId: discountCode.id } });
      if (customerUses >= discountCode.usageLimitPerCustomer) {
        throw new BadRequestException('You have already used this discount code the maximum number of times');
      }
    }

    // 11. Check minimum order amount
    const subtotal = parseFloat(booking.subtotalAmount as unknown as string);
    if (promotion.minOrderAmount !== null) {
      const minOrder = parseFloat(promotion.minOrderAmount as unknown as string);
      if (subtotal < minOrder) {
        throw new BadRequestException(`Order total must be at least ${minOrder} to use this discount code`);
      }
    }

    // 12. Calculate discount amount
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

    const paidAmount = parseFloat(booking.paidAmount as unknown as string);
    const newRemainingAmount = Math.max(0, subtotal - discountAmount - paidAmount);

    // 13. Update booking with discount
    await this.bookingRepo.update(id, {
      discountCodeId: discountCode.id,
      discountAmount,
      remainingAmount: newRemainingAmount,
    });

    // 14. Increment usage counts
    await this.discountCodeRepo.increment({ id: discountCode.id }, 'usedCount', 1);
    await this.promotionRepo.increment({ id: promotion.id }, 'usedCount', 1);

    return this.bookingRepo.findOne({ where: { id } }) as Promise<Booking>;
  }

  // UC15 — View Booking History
  async findMyBookings(customerId: string): Promise<(Booking & { services: BookingServiceEntity[] })[]> {
    const bookings = await this.bookingRepo.find({
      where: { customerId },
      order: { startTime: 'DESC' },
    });
    return this.attachServices(bookings);
  }

  async findOne(id: string, requesterId: string, requesterRole: string): Promise<Booking & { services: BookingServiceEntity[] }> {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);

    const isOwner = requesterRole === UserRole.Owner || requesterRole === UserRole.Staff || requesterRole === UserRole.Manager;
    if (!isOwner && booking.customerId !== requesterId) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    const [withServices] = await this.attachServices([booking]);
    return withServices;
  }

  private async attachServices(bookings: Booking[]): Promise<(Booking & { services: BookingServiceEntity[] })[]> {
    if (bookings.length === 0) return [];
    const ids = bookings.map((b) => b.id);
    const allServices = await this.bookingServiceRepo.find({ where: { bookingId: In(ids) } });
    const servicesByBooking = new Map<string, BookingServiceEntity[]>();
    for (const svc of allServices) {
      const list = servicesByBooking.get(svc.bookingId) ?? [];
      list.push(svc);
      servicesByBooking.set(svc.bookingId, list);
    }
    return bookings.map((b) => Object.assign(b, { services: servicesByBooking.get(b.id) ?? [] }));
  }
}

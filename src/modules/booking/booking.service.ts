import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Booking } from './entities/booking.entity';
import { BookingService as BookingServiceEntity } from './entities/booking-service.entity';
import { BookingSlotConfig } from './entities/booking-slot-config.entity';
import { BranchService as BranchServiceEntity } from 'src/modules/branch-service/entities/branch-service.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { StaffSchedule } from 'src/modules/schedule/entities/staff-schedule';
import { ScheduleRequest } from 'src/modules/schedule/entities/schedule-request.entity';
import { ScheduleType } from 'src/modules/schedule/enums/schedule-type.enum';
import { ScheduleStatus } from 'src/modules/schedule/enums/schedule-status.enum';
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
import { UserService } from 'src/modules/user/user.service';
import { UserStatus } from 'src/modules/user/enums/user-status.enum';
import { AuthProvider } from 'src/modules/user/enums/auth-provider.enum';
import { Gender } from 'src/modules/user/enums/gender.enum';
import { Payment } from 'src/modules/payment/entities/payment.entity';
import { PaymentMethod } from 'src/modules/payment/enums/payment-method.enum';
import { PaymentStatus } from 'src/modules/payment/enums/payment-status.enum';
import { PaymentType } from 'src/modules/payment/enums/payment-type.enum';

const ACTIVE_BOOKING_STATUSES = [BookingStatus.PendingPayment, BookingStatus.Confirmed, BookingStatus.CheckedIn, BookingStatus.InService];

function normalizeVietnamPhone(phone: string): string {
  const compact = phone.replace(/\s/g, '');
  if (/^\+84\d{9}$/.test(compact)) return `0${compact.slice(3)}`;
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
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly userService: UserService,
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
    const depositAmount = Math.round(unitPrice * 0.1);

    // 3. Compute start/end times
    const startTime = new Date(dto.startTime);
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    // 4. Resolve a concrete technician. If the customer chooses "any", assign the first available scheduled technician.
    const technicianId = await this.resolveTechnician(dto.branchId, dto.technicianId, startTime, endTime);

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

    // 7. Create booking. Online appointments are held until the customer pays the deposit.
    const booking = await this.bookingRepo.save(
      this.bookingRepo.create({
        customerId,
        branchId: dto.branchId,
        technicianId,
        startTime,
        endTime,
        status: BookingStatus.PendingPayment,
        source: BookingSource.Online,
        subtotalAmount: unitPrice,
        discountAmount: 0,
        depositRequiredAmount: depositAmount,
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

  async payDeposit(id: string, customerId: string, paymentMethod: PaymentMethod = PaymentMethod.EWallet): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);
    if (booking.customerId !== customerId) throw new ForbiddenException('You do not have access to this booking');
    if (booking.status !== BookingStatus.PendingPayment) {
      throw new BadRequestException('Only bookings waiting for deposit can be paid');
    }

    const depositAmount = parseFloat(booking.depositRequiredAmount as unknown as string);
    if (!Number.isFinite(depositAmount) || depositAmount <= 0) {
      throw new BadRequestException('This booking does not require a deposit');
    }

    const paidAmount = parseFloat(booking.paidAmount as unknown as string);
    const subtotalAmount = parseFloat(booking.subtotalAmount as unknown as string);
    const discountAmount = parseFloat(booking.discountAmount as unknown as string);
    const totalAfterDiscount = Math.max(0, subtotalAmount - discountAmount);
    const nextPaidAmount = Math.min(totalAfterDiscount, paidAmount + depositAmount);
    const nextRemainingAmount = Math.max(0, totalAfterDiscount - nextPaidAmount);

    await this.paymentRepo.save(
      this.paymentRepo.create({
        invoiceId: null,
        bookingId: booking.id,
        customerId: booking.customerId,
        branchId: booking.branchId,
        paymentType: PaymentType.Deposit,
        paymentMethod,
        status: PaymentStatus.Paid,
        amount: depositAmount,
        paidAt: new Date(),
        receivedBy: null,
      }),
    );

    await this.bookingRepo.update(id, {
      status: BookingStatus.Confirmed,
      paidAmount: nextPaidAmount,
      remainingAmount: nextRemainingAmount,
    });

    return this.bookingRepo.findOne({ where: { id } }) as Promise<Booking>;
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
    const newTechnicianId = dto.technicianId !== undefined ? dto.technicianId : booking.technicianId;
    if (dto.technicianId) {
      const assignment = await this.branchStaffRepo.findOne({
        where: { branchId: booking.branchId, userId: dto.technicianId, status: StaffStatus.Active },
      });
      if (!assignment) {
        throw new NotFoundException(`Technician ${dto.technicianId} is not an active staff member at branch ${booking.branchId}`);
      }
      await this.assertTechnicianScheduled(dto.technicianId, booking.branchId, newStartTime, newEndTime);
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
      await this.assertTechnicianScheduled(dto.technicianId, dto.targetBranchId, newStartTime, newEndTime);
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

  // UC18 — Check In Customer
  async checkIn(id: string, staffId: string): Promise<Booking> {
    // 1. Find booking
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);

    // 2. Only confirmed bookings can be checked in
    if (booking.status !== BookingStatus.Confirmed) {
      throw new BadRequestException('Only confirmed bookings can be checked in');
    }

    // 3. Staff must be active at the booking branch
    const assignment = await this.branchStaffRepo.findOne({
      where: { userId: staffId, branchId: booking.branchId, status: StaffStatus.Active },
    });
    if (!assignment) {
      throw new ForbiddenException('You are not an active staff member at this branch');
    }

    // 4. Mark as checked in
    await this.bookingRepo.update(id, {
      status: BookingStatus.CheckedIn,
      checkedInAt: new Date(),
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
    let customerId = dto.customerId;
    if (customerId) {
      const customer = await this.userService.findById(customerId);
      if (!customer || customer.role !== UserRole.Customer || customer.status !== UserStatus.Active) {
        throw new NotFoundException(`Customer ${customerId} not found or inactive`);
      }
    } else {
      const customerName = dto.customerName?.trim();
      const customerPhone = dto.customerPhone ? normalizeVietnamPhone(dto.customerPhone) : '';

      if (!customerName || !customerPhone) {
        throw new BadRequestException('customerId or both customerName and customerPhone are required for walk-in booking');
      }

      if (!/^(0)[0-9]{9}$/.test(customerPhone)) {
        throw new BadRequestException('Customer phone must be a valid Vietnamese phone number');
      }

      const existingCustomer = await this.userService.findByPhone(customerPhone);
      if (existingCustomer) {
        if (existingCustomer.role !== UserRole.Customer || existingCustomer.status !== UserStatus.Active) {
          throw new BadRequestException('This phone number belongs to a non-customer or inactive account');
        }
        customerId = existingCustomer.id;
      } else {
        const createdCustomer = await this.userService.create({
          fullName: customerName,
          email: null,
          phone: customerPhone,
          passwordHash: null,
          authProvider: AuthProvider.Email,
          status: UserStatus.Active,
          gender: Gender.Unknown,
          dateOfBirth: null,
          address: null,
        });
        customerId = createdCustomer.id;
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
    const nowDate = new Date().toISOString().slice(0, 10);
    const slotDate = startTime.toISOString().slice(0, 10);
    if (slotDate !== nowDate) {
      throw new BadRequestException('Walk-in appointments must be scheduled for today');
    }

    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    // 5a. Verify technician has an approved working shift covering this slot
    if (dto.technicianId) {
      await this.assertTechnicianScheduled(dto.technicianId, dto.branchId, startTime, endTime);
    }

    // 6. Check slot capacity
    const dayOfWeek = startTime.getDay();
    const slotConfig = await this.slotConfigRepo
      .createQueryBuilder('sc')
      .where('sc.branchId = :branchId', { branchId: dto.branchId })
      .andWhere('sc.dayOfWeek = :dayOfWeek', { dayOfWeek })
      .andWhere('sc.effectiveFrom <= :date', { date: slotDate })
      .andWhere('(sc.effectiveTo IS NULL OR sc.effectiveTo >= :date)', { date: slotDate })
      .getOne();

    const maxBookings = slotConfig?.maxBookings ?? 1;

    const overlapping = await this.bookingRepo
      .createQueryBuilder('b')
      .where('b.branchId = :branchId', { branchId: dto.branchId })
      .andWhere('b.startTime < :endTime', { endTime })
      .andWhere('b.endTime > :startTime', { startTime })
      .andWhere('b.status IN (:...active)', { active: ACTIVE_BOOKING_STATUSES })
      .getCount();

    if (overlapping >= maxBookings) {
      throw new ConflictException('The selected time slot is fully booked. Please choose a different time.');
    }

    // 7. Create booking — walk-in starts as CheckedIn since the customer is already present
    const booking = await this.bookingRepo.save(
      this.bookingRepo.create({
        customerId,
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
    const newDepositRequiredAmount =
      booking.status === BookingStatus.PendingPayment ? Math.round((subtotal - discountAmount) * 0.1) : booking.depositRequiredAmount;

    // 13. Update booking with discount
    await this.bookingRepo.update(id, {
      discountCodeId: discountCode.id,
      discountAmount,
      depositRequiredAmount: newDepositRequiredAmount,
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
      relations: ['customer', 'technician'],
    });
    return this.attachServices(bookings);
  }

  async findBranchBookings(branchId: string, requesterId: string, requesterRole: string): Promise<(Booking & { services: BookingServiceEntity[] })[]> {
    if (requesterRole !== UserRole.Owner) {
      const assignment = await this.branchStaffRepo.findOne({
        where: { userId: requesterId, branchId, status: StaffStatus.Active },
      });
      if (!assignment) throw new ForbiddenException('You are not active at this branch');
    }

    const bookings = await this.bookingRepo.find({
      where: { branchId },
      order: { startTime: 'DESC' },
      relations: ['customer', 'technician'],
    });
    return this.attachServices(bookings);
  }

  async findOne(id: string, requesterId: string, requesterRole: string): Promise<Booking & { services: BookingServiceEntity[] }> {
    const booking = await this.bookingRepo.findOne({ where: { id }, relations: ['customer', 'technician'] });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);

    const isOwner = requesterRole === UserRole.Owner || requesterRole === UserRole.Staff || requesterRole === UserRole.Manager;
    if (!isOwner && booking.customerId !== requesterId) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    const [withServices] = await this.attachServices([booking]);
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

    await this.assertTechnicianScheduled(dto.newTechnicianId, booking.branchId, booking.startTime, booking.endTime);

    await this.bookingRepo.update(id, { technicianId: dto.newTechnicianId });

    const updated = (await this.bookingRepo.findOne({ where: { id } })) as Booking;
    const [withServices] = await this.attachServices([updated]);
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

    for (const technician of technicians) {
      const scheduledCount = await this.scheduleRequestRepo
        .createQueryBuilder('sr')
        .where('sr.staffId = :technicianId', { technicianId: technician.userId })
        .andWhere('sr.branchId = :branchId', { branchId })
        .andWhere('sr.requestType = :type', { type: ScheduleRequestType.WorkShift })
        .andWhere('sr.status = :status', { status: ApprovalStatus.Approved })
        .andWhere('sr.requestedStart <= :start', { start: startTime })
        .andWhere('sr.requestedEnd >= :end', { end: endTime })
        .getCount();
      if (scheduledCount === 0) continue;

      const overlapping = await this.countTechnicianOverlaps(technician.userId, startTime, endTime);
      if (overlapping === 0) return technician.userId;
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

  private async attachServices(bookings: Booking[]): Promise<(Booking & { services: BookingServiceEntity[] })[]> {
    if (bookings.length === 0) return [];
    const ids = bookings.map((b) => b.id);
    const allServices = await this.bookingServiceRepo.find({
      where: { bookingId: In(ids) },
      relations: ['service'],
    });
    const servicesByBooking = new Map<string, BookingServiceEntity[]>();
    for (const svc of allServices) {
      const list = servicesByBooking.get(svc.bookingId) ?? [];
      list.push(svc);
      servicesByBooking.set(svc.bookingId, list);
    }
    return bookings.map((b) => Object.assign(b, { services: servicesByBooking.get(b.id) ?? [] }));
  }
}

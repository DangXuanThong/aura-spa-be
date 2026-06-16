import { ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  async findMyBookings(customerId: string): Promise<Booking[]> {
    return this.bookingRepo.find({
      where: { customerId },
      order: { startTime: 'DESC' },
    });
  }

  async findOne(id: string, requesterId: string, requesterRole: string): Promise<Booking> {
    const booking = await this.bookingRepo.findOne({ where: { id } });
    if (!booking) throw new NotFoundException(`Booking ${id} not found`);

    const isOwner = requesterRole === UserRole.Owner || requesterRole === UserRole.Staff || requesterRole === UserRole.Manager;
    if (!isOwner && booking.customerId !== requesterId) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    return booking;
  }
}

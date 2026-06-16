import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingSlotConfig } from './entities/booking-slot-config.entity';
import { Booking } from './entities/booking.entity';
import { BranchService as BranchServiceEntity } from 'src/modules/branch-service/entities/branch-service.entity';
import { BookingStatus } from './enums/booking-status.enum';
import { AvailableSlotsResponseDto, TimeSlotDto } from './dto/available-slots-response.dto';

const CANCELLED_STATUSES = [BookingStatus.Cancelled, BookingStatus.NoShow, BookingStatus.Rescheduled, BookingStatus.Transferred];

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTimeStr(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

function slotDateTime(date: string, timeStr: string): Date {
  // Constructs a Date from local YYYY-MM-DD + HH:MM using +07:00
  return new Date(`${date}T${timeStr}:00+07:00`);
}

@Injectable()
export class BookingAvailabilityService {
  constructor(
    @InjectRepository(BookingSlotConfig)
    private readonly slotConfigRepo: Repository<BookingSlotConfig>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BranchServiceEntity)
    private readonly branchServiceRepo: Repository<BranchServiceEntity>,
  ) {}

  // UC09 — Search Branch & Service: check available booking slots for planning a visit
  async getAvailableSlots(branchId: string, serviceId: string, date: string): Promise<AvailableSlotsResponseDto> {
    const targetDate = new Date(`${date}T12:00:00+07:00`); // noon local time avoids DST edge cases
    const dayOfWeek = targetDate.getDay(); // 0 = Sunday

    // Find the active slot config for this branch and day
    const slotConfig = await this.slotConfigRepo
      .createQueryBuilder('sc')
      .where('sc.branchId = :branchId', { branchId })
      .andWhere('sc.dayOfWeek = :dayOfWeek', { dayOfWeek })
      .andWhere('sc.effectiveFrom <= :date', { date })
      .andWhere('(sc.effectiveTo IS NULL OR sc.effectiveTo >= :date)', { date })
      .getOne();

    if (!slotConfig) {
      return { branchId, serviceId, date, serviceDurationMinutes: 0, slots: [] };
    }

    // Resolve effective service duration at this branch
    const branchSvc = await this.branchServiceRepo.findOne({
      where: { branchId, serviceId, isEnabled: true },
      relations: ['service'],
    });

    if (!branchSvc) {
      throw new NotFoundException(`Service ${serviceId} is not available at branch ${branchId}`);
    }

    const durationMinutes = branchSvc.durationMinutesOverride ?? branchSvc.service!.defaultDurationMinutes;

    // Fetch all active bookings at this branch for the target day
    const dayStart = slotDateTime(date, '00:00');
    const dayEnd = slotDateTime(date, '23:59');

    const dayBookings = await this.bookingRepo
      .createQueryBuilder('b')
      .where('b.branchId = :branchId', { branchId })
      .andWhere('b.startTime < :dayEnd', { dayEnd })
      .andWhere('b.endTime > :dayStart', { dayStart })
      .andWhere('b.status NOT IN (:...cancelled)', { cancelled: CANCELLED_STATUSES })
      .getMany();

    // Generate slots and compute availability
    const startMin = timeToMinutes(slotConfig.startTime);
    const endMin = timeToMinutes(slotConfig.endTime);
    const slots: TimeSlotDto[] = [];

    for (let t = startMin; t + durationMinutes <= endMin; t += slotConfig.slotMinutes) {
      const slotStart = slotDateTime(date, minutesToTimeStr(t));
      const slotEnd = new Date(slotStart.getTime() + durationMinutes * 60 * 1000);

      const overlapping = dayBookings.filter((b) => b.startTime < slotEnd && b.endTime > slotStart);
      const remaining = Math.max(0, slotConfig.maxBookings - overlapping.length);

      slots.push({
        startTime: minutesToTimeStr(t),
        endTime: minutesToTimeStr(t + durationMinutes),
        available: remaining > 0,
        remainingCapacity: remaining,
        maxCapacity: slotConfig.maxBookings,
      });
    }

    return { branchId, serviceId, date, serviceDurationMinutes: durationMinutes, slots };
  }
}

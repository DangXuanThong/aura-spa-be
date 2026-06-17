import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduleRequest } from './entities/schedule-request.entity';
import { StaffSchedule } from './entities/staff-schedule';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { ApprovalStatus } from './enums/approval-status.enum';
import { ScheduleStatus } from './enums/schedule-status.enum';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { CreateScheduleRequestDto } from './dto/create-schedule-request.dto';
import { StaffShiftResponseDto } from './dto/staff-shift-response.dto';
import { TimetableAppointmentDto, TimetableDayDto } from './dto/timetable-day.dto';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(ScheduleRequest)
    private readonly scheduleRequestRepo: Repository<ScheduleRequest>,
    @InjectRepository(StaffSchedule)
    private readonly staffScheduleRepo: Repository<StaffSchedule>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BranchStaff)
    private readonly branchStaffRepo: Repository<BranchStaff>,
  ) {}

  // UC21 — Submit schedule request
  async create(dto: CreateScheduleRequestDto, staffId: string): Promise<ScheduleRequest> {
    // 1. Staff must be active at the specified branch
    const assignment = await this.branchStaffRepo.findOne({
      where: { userId: staffId, branchId: dto.branchId, status: StaffStatus.Active },
    });
    if (!assignment) {
      throw new ForbiddenException('You are not an active staff member at this branch');
    }

    // 2. Time range must be valid and in the future
    const start = new Date(dto.requestedStart);
    const end = new Date(dto.requestedEnd);
    if (end <= start) {
      throw new BadRequestException('requestedEnd must be after requestedStart');
    }
    if (start <= new Date()) {
      throw new BadRequestException('requestedStart must be in the future');
    }

    return this.scheduleRequestRepo.save(
      this.scheduleRequestRepo.create({
        staffId,
        branchId: dto.branchId,
        requestType: dto.requestType,
        requestedStart: start,
        requestedEnd: end,
        status: ApprovalStatus.Pending,
        reason: dto.reason ?? null,
        reviewedBy: null,
        reviewedAt: null,
      }),
    );
  }

  // UC21 — View own schedule requests
  async findMine(staffId: string): Promise<ScheduleRequest[]> {
    return this.scheduleRequestRepo.find({
      where: { staffId },
      order: { requestedStart: 'DESC' },
    });
  }

  // UC22 — View personal shift timetable with assigned customers
  async getMyTimetable(staffId: string, from: string, to: string): Promise<TimetableDayDto[]> {
    if (to < from) throw new BadRequestException('to must be on or after from');

    const fromDate = new Date(`${from}T00:00:00.000Z`);
    const toDate = new Date(`${to}T23:59:59.999Z`);

    const excluded = [BookingStatus.Cancelled, BookingStatus.Rescheduled, BookingStatus.Transferred];

    const [shifts, bookings] = await Promise.all([
      this.staffScheduleRepo
        .createQueryBuilder('ss')
        .where('ss.staffId = :staffId', { staffId })
        .andWhere('ss.status = :status', { status: ScheduleStatus.Active })
        .andWhere('ss.startTime < :toDate', { toDate })
        .andWhere('ss.endTime > :fromDate', { fromDate })
        .orderBy('ss.startTime', 'ASC')
        .getMany(),
      this.bookingRepo
        .createQueryBuilder('b')
        .leftJoinAndSelect('b.customer', 'customer')
        .where('b.technicianId = :staffId', { staffId })
        .andWhere('b.startTime >= :fromDate', { fromDate })
        .andWhere('b.startTime <= :toDate', { toDate })
        .andWhere('b.status NOT IN (:...excluded)', { excluded })
        .orderBy('b.startTime', 'ASC')
        .getMany(),
    ]);

    // Build day buckets for every date in the range
    const dayMap = new Map<string, TimetableDayDto>();
    const cursor = new Date(fromDate);
    const rangeEnd = new Date(`${to}T00:00:00.000Z`);
    while (cursor <= rangeEnd) {
      const key = cursor.toISOString().slice(0, 10);
      dayMap.set(key, { date: key, shifts: [], appointments: [] });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    for (const shift of shifts) {
      const key = shift.startTime.toISOString().slice(0, 10);
      const day = dayMap.get(key);
      if (!day) continue;
      const dto = new StaffShiftResponseDto();
      dto.id = shift.id;
      dto.branchId = shift.branchId;
      dto.scheduleType = shift.scheduleType;
      dto.status = shift.status;
      dto.startTime = shift.startTime;
      dto.endTime = shift.endTime;
      day.shifts.push(dto);
    }

    for (const booking of bookings) {
      const key = booking.startTime.toISOString().slice(0, 10);
      const day = dayMap.get(key);
      if (!day) continue;
      const dto = new TimetableAppointmentDto();
      dto.id = booking.id;
      dto.customerId = booking.customerId;
      dto.customerName = booking.customer?.fullName ?? '';
      dto.customerPhone = booking.customer?.phone ?? null;
      dto.startTime = booking.startTime;
      dto.endTime = booking.endTime;
      dto.status = booking.status;
      day.appointments.push(dto);
    }

    return Array.from(dayMap.values());
  }

  // UC21 — Cancel a pending schedule request
  async cancel(id: string, staffId: string): Promise<ScheduleRequest> {
    const request = await this.scheduleRequestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException(`Schedule request ${id} not found`);
    if (request.staffId !== staffId) throw new ForbiddenException('You do not own this request');
    if (request.status !== ApprovalStatus.Pending) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    await this.scheduleRequestRepo.update(id, { status: ApprovalStatus.Cancelled });
    return this.scheduleRequestRepo.findOne({ where: { id } }) as Promise<ScheduleRequest>;
  }
}

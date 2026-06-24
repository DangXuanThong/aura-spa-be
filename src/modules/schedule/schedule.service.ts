import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduleRequest } from './entities/schedule-request.entity';
import { StaffSchedule } from './entities/staff-schedule';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { ApprovalStatus } from './enums/approval-status.enum';
import { ScheduleRequestType } from './enums/schedule-request-type.enum';
import { ScheduleStatus } from './enums/schedule-status.enum';
import { ScheduleType } from './enums/schedule-type.enum';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { CreateScheduleRequestDto } from './dto/create-schedule-request.dto';
import { StaffShiftResponseDto } from './dto/staff-shift-response.dto';
import { TimetableAppointmentDto, TimetableDayDto } from './dto/timetable-day.dto';

const REQUEST_TYPE_TO_SCHEDULE_TYPE: Record<ScheduleRequestType, ScheduleType> = {
  [ScheduleRequestType.WorkShift]: ScheduleType.Working,
  [ScheduleRequestType.DayOff]: ScheduleType.DayOff,
  [ScheduleRequestType.Leave]: ScheduleType.Leave,
};

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

    const excluded = [BookingStatus.PendingPayment, BookingStatus.Cancelled, BookingStatus.Rescheduled, BookingStatus.Transferred];

    const [shifts, bookings] = await Promise.all([
      this.scheduleRequestRepo
        .createQueryBuilder('sr')
        .where('sr.staffId = :staffId', { staffId })
        .andWhere('sr.requestType = :type', { type: ScheduleRequestType.WorkShift })
        .andWhere('sr.status = :status', { status: ApprovalStatus.Approved })
        .andWhere('sr.requestedStart < :toDate', { toDate })
        .andWhere('sr.requestedEnd > :fromDate', { fromDate })
        .orderBy('sr.requestedStart', 'ASC')
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
      for (const [key, day] of dayMap) {
        const dayStart = new Date(`${key}T00:00:00.000Z`);
        const dayEnd = new Date(`${key}T23:59:59.999Z`);
        if (shift.requestedStart >= dayEnd || shift.requestedEnd <= dayStart) continue;

        const startTime = new Date(dayStart);
        startTime.setUTCHours(shift.requestedStart.getUTCHours(), shift.requestedStart.getUTCMinutes(), 0, 0);
        const endTime = new Date(dayStart);
        endTime.setUTCHours(shift.requestedEnd.getUTCHours(), shift.requestedEnd.getUTCMinutes(), 0, 0);

        const dto = new StaffShiftResponseDto();
        dto.id = shift.id;
        dto.branchId = shift.branchId;
        dto.scheduleType = REQUEST_TYPE_TO_SCHEDULE_TYPE[shift.requestType];
        dto.status = ScheduleStatus.Active;
        dto.startTime = startTime < shift.requestedStart ? shift.requestedStart : startTime;
        dto.endTime = endTime > shift.requestedEnd ? shift.requestedEnd : endTime;
        day.shifts.push(dto);
      }
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

  // UC26 — List schedule requests for a branch (manager)
  async listByBranch(
    branchId: string,
    managerId: string,
    status?: ApprovalStatus,
  ): Promise<(ScheduleRequest & { staffFullName: string; staffEmail: string | null })[]> {
    await this.assertManagerAtBranch(managerId, branchId);

    const requests = await this.scheduleRequestRepo.find({
      where: { branchId, ...(status ? { status } : {}) },
      relations: ['staff'],
      order: { requestedStart: 'ASC' },
    });

    return requests.map((r) => Object.assign(r, { staffFullName: r.staff?.fullName ?? '', staffEmail: r.staff?.email ?? null }));
  }

  // Owner: List all pending schedule requests system-wide
  async listAllPending(): Promise<(ScheduleRequest & { staffFullName: string; staffEmail: string | null; branchName: string })[]> {
    const requests = await this.scheduleRequestRepo.find({
      where: { status: ApprovalStatus.Pending },
      relations: ['staff', 'branch'],
      order: { requestedStart: 'ASC' },
    });

    return requests.map((r) =>
      Object.assign(r, {
        staffFullName: r.staff?.fullName ?? '',
        staffEmail: r.staff?.email ?? null,
        branchName: r.branch?.name ?? '',
      }),
    );
  }

  // UC26 — Approve a schedule request and create the corresponding shift
  async approve(id: string, reviewerId: string, role?: string): Promise<ScheduleRequest> {
    const request = await this.scheduleRequestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Schedule request not found');
    if (request.status !== ApprovalStatus.Pending) {
      throw new BadRequestException('Only pending requests can be approved');
    }

    if (role !== 'owner') {
      await this.assertManagerAtBranch(reviewerId, request.branchId);
    }

    const now = new Date();
    await this.scheduleRequestRepo.update(id, { status: ApprovalStatus.Approved, reviewedBy: reviewerId, reviewedAt: now });

    await this.staffScheduleRepo.save(
      this.staffScheduleRepo.create({
        staffId: request.staffId,
        branchId: request.branchId,
        startTime: request.requestedStart,
        endTime: request.requestedEnd,
        scheduleType: REQUEST_TYPE_TO_SCHEDULE_TYPE[request.requestType],
        status: ScheduleStatus.Active,
        sourceRequestId: request.id,
        createdBy: reviewerId,
      }),
    );

    return this.scheduleRequestRepo.findOne({ where: { id } }) as Promise<ScheduleRequest>;
  }

  // UC26 — Reject a schedule request
  async reject(id: string, reviewerId: string, role?: string): Promise<ScheduleRequest> {
    const request = await this.scheduleRequestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Schedule request not found');
    if (request.status !== ApprovalStatus.Pending) {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    if (role !== 'owner') {
      await this.assertManagerAtBranch(reviewerId, request.branchId);
    }

    const now = new Date();
    await this.scheduleRequestRepo.update(id, { status: ApprovalStatus.Rejected, reviewedBy: reviewerId, reviewedAt: now });

    return this.scheduleRequestRepo.findOne({ where: { id } }) as Promise<ScheduleRequest>;
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

  private async assertManagerAtBranch(managerId: string, branchId: string): Promise<void> {
    const assignment = await this.branchStaffRepo.findOne({
      where: { userId: managerId, branchId, status: StaffStatus.Active },
    });
    if (!assignment) throw new ForbiddenException('You are not an active staff member at this branch');
  }
}

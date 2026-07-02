import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { vietnamDate } from 'src/common/utils/vietnam-date';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, LessThan, LessThanOrEqual, MoreThan, MoreThanOrEqual, Repository } from 'typeorm';
import { ScheduleRequest } from './entities/schedule-request.entity';
import { StaffSchedule } from './entities/staff-schedule.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { Review } from 'src/modules/review/entities/review.entity';
import { ReviewStatus } from 'src/modules/review/enums/review-status.enum';
import { ApprovalStatus } from './enums/approval-status.enum';
import { ScheduleRequestType } from './enums/schedule-request-type.enum';
import { ScheduleStatus } from './enums/schedule-status.enum';
import { ScheduleType } from './enums/schedule-type.enum';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { CreateScheduleRequestDto } from './dto/create-schedule-request.dto';
import { StaffShiftResponseDto } from './dto/staff-shift-response.dto';
import { TimetableAppointmentDto, TimetableDayDto } from './dto/timetable-day.dto';
import { UserRole } from 'src/modules/user/enums/user-role.enum';

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
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    private readonly dataSource: DataSource,
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

    // 3. No overlapping pending requests for this staff at this branch
    const overlap = await this.scheduleRequestRepo.findOne({
      where: {
        staffId,
        branchId: dto.branchId,
        status: ApprovalStatus.Pending,
        requestedStart: LessThan(end),
        requestedEnd: MoreThan(start),
      },
    });
    if (overlap) {
      throw new ConflictException('You already have a pending schedule request that overlaps this time range');
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

        // Clamp shift bounds to the current day window — handles overnight shifts correctly
        const startTime = shift.requestedStart > dayStart ? shift.requestedStart : dayStart;
        const endTime = shift.requestedEnd < dayEnd ? shift.requestedEnd : dayEnd;

        const dto = new StaffShiftResponseDto();
        dto.id = shift.id;
        dto.branchId = shift.branchId;
        dto.scheduleType = REQUEST_TYPE_TO_SCHEDULE_TYPE[shift.requestType];
        dto.status = ScheduleStatus.Active;
        dto.startTime = startTime;
        dto.endTime = endTime;
        day.shifts.push(dto);
      }
    }

    for (const booking of bookings) {
      const key = vietnamDate.toDateString(booking.startTime);
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
  async approve(id: string, managerId: string): Promise<ScheduleRequest> {
    const request = await this.scheduleRequestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Schedule request not found');

    await this.assertManagerAtBranch(managerId, request.branchId);

    await this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOne(ScheduleRequest, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) throw new NotFoundException('Schedule request not found');
      if (locked.status !== ApprovalStatus.Pending) {
        throw new BadRequestException('Only pending requests can be approved');
      }

      const now = new Date();
      await manager.update(ScheduleRequest, id, {
        status: ApprovalStatus.Approved,
        reviewedBy: managerId,
        reviewedAt: now,
      });

      await manager.save(
        manager.create(StaffSchedule, {
          staffId: locked.staffId,
          branchId: locked.branchId,
          startTime: locked.requestedStart,
          endTime: locked.requestedEnd,
          scheduleType: REQUEST_TYPE_TO_SCHEDULE_TYPE[locked.requestType],
          status: ScheduleStatus.Active,
          sourceRequestId: locked.id,
          createdBy: managerId,
        }),
      );
    });

    return this.scheduleRequestRepo.findOne({ where: { id } }) as Promise<ScheduleRequest>;
  }

  // UC26 — Reject a schedule request
  async reject(id: string, managerId: string): Promise<ScheduleRequest> {
    const request = await this.scheduleRequestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Schedule request not found');
    if (request.status !== ApprovalStatus.Pending) {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    await this.assertManagerAtBranch(managerId, request.branchId);

    const now = new Date();
    await this.scheduleRequestRepo.update(id, { status: ApprovalStatus.Rejected, reviewedBy: managerId, reviewedAt: now });

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

  async getActiveStaff(branchId: string, userId: string, role: string): Promise<any[]> {
    let targetBranchId = branchId;
    if (role !== UserRole.Owner) {
      const assignment = await this.branchStaffRepo.findOne({
        where: { userId, branchId, status: StaffStatus.Active },
      });
      if (!assignment) {
        throw new ForbiddenException('You are not an active staff member at this branch');
      }
      targetBranchId = branchId;
    }

    const now = new Date();
    const schedules = await this.staffScheduleRepo.find({
      where: {
        scheduleType: ScheduleType.Working,
        status: ScheduleStatus.Active,
        startTime: LessThanOrEqual(now),
        endTime: MoreThanOrEqual(now),
        ...(targetBranchId !== 'all' ? { branchId: targetBranchId } : {}),
      },
      relations: ['staff', 'branch'],
    });

    const staffIds = schedules.map((s) => s.staffId);
    let assignments: BranchStaff[] = [];
    if (staffIds.length > 0) {
      assignments = await this.branchStaffRepo.find({
        where: {
          userId: In(staffIds),
          status: StaffStatus.Active,
        },
      });
    }
    const assignmentMap = new Map(assignments.map((a) => [a.userId, a]));

    const ratingsMap = new Map<string, number>();
    if (staffIds.length > 0) {
      const ratingsRows = await this.reviewRepo
        .createQueryBuilder('r')
        .select('r.technicianId', 'technicianId')
        .addSelect('AVG(r.rating)', 'avgRating')
        .where('r.technicianId IN (:...staffIds)', { staffIds })
        .andWhere('r.status = :status', { status: ReviewStatus.Published })
        .groupBy('r.technicianId')
        .getRawMany<{ technicianId: string; avgRating: string }>();
      for (const item of ratingsRows) {
        ratingsMap.set(item.technicianId, parseFloat(item.avgRating || '5.0'));
      }
    }

    return schedules.map((s) => {
      const assignment = assignmentMap.get(s.staffId);
      return {
        shiftId: s.id,
        staffId: s.staffId,
        name: s.staff?.fullName || '',
        email: s.staff?.email || null,
        phone: s.staff?.phone || null,
        position: assignment?.position || 'technician',
        branchId: s.branchId,
        branchName: s.branch?.name || '',
        startTime: s.startTime,
        endTime: s.endTime,
        rating: Math.round((ratingsMap.get(s.staffId) ?? 5.0) * 10) / 10,
      };
    });
  }

  // BUG-142 — Cancel a StaffSchedule and unassign affected future bookings
  async cancelStaffSchedule(scheduleId: string, requesterId: string, requesterRole: string): Promise<StaffSchedule> {
    const schedule = await this.staffScheduleRepo.findOne({ where: { id: scheduleId } });
    if (!schedule) throw new NotFoundException(`Staff schedule ${scheduleId} not found`);
    if (schedule.status === ScheduleStatus.Cancelled) {
      throw new BadRequestException('Staff schedule is already cancelled');
    }

    if (requesterRole !== UserRole.Owner) {
      await this.assertManagerAtBranch(requesterId, schedule.branchId);
    }

    const now = new Date();
    await this.dataSource.transaction(async (manager) => {
      await manager.update(StaffSchedule, { id: scheduleId }, { status: ScheduleStatus.Cancelled });

      // Unassign future bookings that fall within this schedule window
      await manager.update(
        Booking,
        {
          technicianId: schedule.staffId,
          branchId: schedule.branchId,
          status: In([BookingStatus.PendingPayment, BookingStatus.Confirmed]),
          startTime: MoreThanOrEqual(now),
        },
        { technicianId: null },
      );
    });

    return this.staffScheduleRepo.findOne({ where: { id: scheduleId } }) as Promise<StaffSchedule>;
  }

  private async assertManagerAtBranch(managerId: string, branchId: string): Promise<void> {
    const assignment = await this.branchStaffRepo.findOne({
      where: { userId: managerId, branchId, status: StaffStatus.Active },
    });
    if (!assignment) throw new ForbiddenException('You are not an active staff member at this branch');
  }
}

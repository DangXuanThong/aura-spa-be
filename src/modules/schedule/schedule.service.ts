import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { ScheduleRequest } from './entities/schedule-request.entity';
import { StaffSchedule } from './entities/staff-schedule.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { ApprovalStatus } from './enums/approval-status.enum';
import { ScheduleRequestType } from './enums/schedule-request-type.enum';
import { ScheduleStatus } from './enums/schedule-status.enum';
import { ScheduleType } from './enums/schedule-type.enum';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { CreateScheduleRequestDto } from './dto/create-schedule-request.dto';
import { AssignShiftDto } from './dto/assign-shift.dto';
import { StaffShiftResponseDto } from './dto/staff-shift-response.dto';
import { TimetableAppointmentDto, TimetableDayDto } from './dto/timetable-day.dto';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { SCHEDULE_REQUEST_EVENTS } from 'src/common/constants/events';

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
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateScheduleRequestDto, staffId: string): Promise<ScheduleRequest> {
    const assignment = await this.branchStaffRepo.findOne({
      where: { userId: staffId, branchId: dto.branchId, status: StaffStatus.Active },
    });
    if (!assignment) {
      throw new ForbiddenException('You are not an active staff member at this branch');
    }

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

  async findMine(staffId: string): Promise<ScheduleRequest[]> {
    return this.scheduleRequestRepo.find({
      where: { staffId },
      order: { requestedStart: 'DESC' },
    });
  }

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

  async approve(id: string, managerId: string): Promise<ScheduleRequest> {
    const request = await this.scheduleRequestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Schedule request not found');
    if (request.status !== ApprovalStatus.Pending) {
      throw new BadRequestException('Only pending requests can be approved');
    }

    await this.assertManagerAtBranch(managerId, request.branchId);

    const now = new Date();
    await this.scheduleRequestRepo.update(id, { status: ApprovalStatus.Approved, reviewedBy: managerId, reviewedAt: now });

    await this.staffScheduleRepo.save(
      this.staffScheduleRepo.create({
        staffId: request.staffId,
        branchId: request.branchId,
        startTime: request.requestedStart,
        endTime: request.requestedEnd,
        scheduleType: REQUEST_TYPE_TO_SCHEDULE_TYPE[request.requestType],
        status: ScheduleStatus.Active,
        sourceRequestId: request.id,
        createdBy: managerId,
      }),
    );

    const approved = (await this.scheduleRequestRepo.findOne({ where: { id } })) as ScheduleRequest;
    this.emitScheduleEvent(SCHEDULE_REQUEST_EVENTS.APPROVED, approved, managerId);
    return approved;
  }

  async batchApprove(ids: string[], managerId: string): Promise<void> {
    for (const id of ids) {
      try {
        await this.approve(id, managerId);
      } catch {
        // Continue approving the remaining requests.
      }
    }
  }

  async reject(id: string, managerId: string): Promise<ScheduleRequest> {
    const request = await this.scheduleRequestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Schedule request not found');
    if (request.status !== ApprovalStatus.Pending) {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    await this.assertManagerAtBranch(managerId, request.branchId);

    const now = new Date();
    await this.scheduleRequestRepo.update(id, { status: ApprovalStatus.Rejected, reviewedBy: managerId, reviewedAt: now });

    const rejected = (await this.scheduleRequestRepo.findOne({ where: { id } })) as ScheduleRequest;
    this.emitScheduleEvent(SCHEDULE_REQUEST_EVENTS.REJECTED, rejected, managerId);
    return rejected;
  }

  async cancel(id: string, staffId: string): Promise<ScheduleRequest> {
    const request = await this.scheduleRequestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException(`Schedule request ${id} not found`);
    if (request.staffId !== staffId) throw new ForbiddenException('You do not own this request');
    if (request.status !== ApprovalStatus.Pending) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    await this.scheduleRequestRepo.update(id, { status: ApprovalStatus.Cancelled });
    const cancelled = (await this.scheduleRequestRepo.findOne({ where: { id } })) as ScheduleRequest;
    this.emitScheduleEvent(SCHEDULE_REQUEST_EVENTS.CANCELLED, cancelled);
    return cancelled;
  }

  async getActiveStaff(branchId: string, userId: string, role: string): Promise<any[]> {
    let targetBranchId = branchId;
    if (role !== UserRole.Owner) {
      const assignment = await this.branchStaffRepo.findOne({
        where: { userId, status: StaffStatus.Active },
      });
      if (!assignment) {
        throw new ForbiddenException('You are not an active staff member at any branch');
      }
      targetBranchId = assignment.branchId;
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
      const ratingsRaw = await this.bookingRepo.query(
        `SELECT technician_id AS "technicianId", AVG(rating) AS "avgRating"
           FROM reviews
           WHERE technician_id IN (${staffIds.map((_, i) => `$${i + 1}`).join(', ')}) AND status = 'published'
           GROUP BY technician_id`,
        staffIds,
      );
      for (const item of ratingsRaw) {
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

  async assignShiftDirectly(dto: AssignShiftDto, managerId: string): Promise<ScheduleRequest> {
    await this.assertManagerAtBranch(managerId, dto.branchId);

    const start = new Date(`${dto.date}T${dto.startTime}:00+07:00`);
    const end = new Date(`${dto.date}T${dto.endTime}:00+07:00`);

    if (end <= start) {
      throw new BadRequestException('End time must be after start time');
    }

    const type = (dto.requestType as ScheduleRequestType) || ScheduleRequestType.WorkShift;

    const request = await this.scheduleRequestRepo.save(
      this.scheduleRequestRepo.create({
        staffId: dto.staffId,
        branchId: dto.branchId,
        requestType: type,
        requestedStart: start,
        requestedEnd: end,
        status: ApprovalStatus.Approved,
        reason: 'Manager assigned directly',
        reviewedBy: managerId,
        reviewedAt: new Date(),
      }),
    );

    await this.staffScheduleRepo.save(
      this.staffScheduleRepo.create({
        staffId: dto.staffId,
        branchId: dto.branchId,
        startTime: start,
        endTime: end,
        scheduleType: REQUEST_TYPE_TO_SCHEDULE_TYPE[type],
        status: ScheduleStatus.Active,
        sourceRequestId: request.id,
        createdBy: managerId,
      }),
    );

    this.emitScheduleEvent(SCHEDULE_REQUEST_EVENTS.APPROVED, request, managerId);
    return request;
  }

  async removeShift(id: string, managerId: string): Promise<void> {
    const request = await this.scheduleRequestRepo.findOne({ where: { id } });
    if (!request) throw new NotFoundException('Shift not found');
    await this.assertManagerAtBranch(managerId, request.branchId);

    await this.staffScheduleRepo.delete({ sourceRequestId: id });
    await this.scheduleRequestRepo.delete(id);
  }

  private async assertManagerAtBranch(managerId: string, branchId: string): Promise<void> {
    const assignment = await this.branchStaffRepo.findOne({
      where: { userId: managerId, branchId, status: StaffStatus.Active },
    });
    if (!assignment) throw new ForbiddenException('You are not an active staff member at this branch');
  }

  private emitScheduleEvent(event: string, request: ScheduleRequest, reviewedBy?: string): void {
    this.eventEmitter.emit(event, {
      requestId: request.id,
      staffId: request.staffId,
      branchId: request.branchId,
      reviewedBy,
      requestType: request.requestType,
      requestedStart: request.requestedStart,
      requestedEnd: request.requestedEnd,
    });
  }
}

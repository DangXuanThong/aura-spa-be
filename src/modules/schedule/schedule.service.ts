import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduleRequest } from './entities/schedule-request.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { ApprovalStatus } from './enums/approval-status.enum';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { CreateScheduleRequestDto } from './dto/create-schedule-request.dto';

@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(ScheduleRequest)
    private readonly scheduleRequestRepo: Repository<ScheduleRequest>,
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

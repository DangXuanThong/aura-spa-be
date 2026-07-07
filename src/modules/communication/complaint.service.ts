import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { COMPLAINT_EVENTS } from 'src/common/constants/events';
import { Complaint } from './entities/complaint.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { ComplaintStatus } from './enums/complaint-status.enum';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { ResolveComplaintDto } from './dto/resolve-complaint.dto';
import { UserRole } from 'src/modules/user/enums/user-role.enum';

const ACTIONABLE_STATUSES = [ComplaintStatus.Open, ComplaintStatus.InProgress];

@Injectable()
export class ComplaintService {
  constructor(
    @InjectRepository(Complaint)
    private readonly complaintRepo: Repository<Complaint>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BranchStaff)
    private readonly branchStaffRepo: Repository<BranchStaff>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateComplaintDto, customerId: string): Promise<Complaint> {
    let branchId = dto.branchId;
    let bookingId = dto.bookingId ?? null;

    if (dto.bookingId) {
      const booking = await this.bookingRepo.findOne({ where: { id: dto.bookingId } });
      if (!booking) throw new NotFoundException(`Booking ${dto.bookingId} not found`);
      if (booking.customerId !== customerId) throw new ForbiddenException('You do not have access to this booking');

      branchId = booking.branchId;
      bookingId = booking.id;
    }

    if (!branchId) {
      throw new BadRequestException('branchId is required when bookingId is not provided');
    }

    const complaint = await this.complaintRepo.save(
      this.complaintRepo.create({
        customerId,
        branchId,
        bookingId,
        title: dto.title.trim(),
        description: dto.description.trim(),
        status: ComplaintStatus.Open,
      }),
    );

    const created = await this.findUpdatedComplaint(complaint.id, ['customer', 'branch', 'booking']);
    this.eventEmitter.emit(COMPLAINT_EVENTS.CREATED, {
      complaintId: created.id,
      customerId,
      customerName: created.customer?.fullName ?? 'Customer',
      branchId: created.branchId,
      title: created.title,
    });

    return created;
  }

  async findMine(customerId: string): Promise<Complaint[]> {
    return this.complaintRepo.find({
      where: { customerId },
      relations: ['customer', 'branch', 'booking'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async listByBranch(branchId: string, managerId: string, status?: ComplaintStatus): Promise<Complaint[]> {
    await this.assertManagerAtBranch(managerId, branchId);

    const where: Record<string, unknown> = { branchId };
    if (status) where.status = status;

    return this.complaintRepo.find({
      where,
      relations: ['customer', 'branch', 'booking'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, requesterId: string, requesterRole: string): Promise<Complaint> {
    const complaint = await this.complaintRepo.findOne({ where: { id }, relations: ['customer', 'branch', 'booking'] });
    if (!complaint) throw new NotFoundException(`Complaint ${id} not found`);

    if (requesterRole === UserRole.Customer) {
      if (complaint.customerId !== requesterId) {
        throw new ForbiddenException('You do not have access to this complaint');
      }
    } else {
      await this.assertManagerAtBranch(requesterId, complaint.branchId);
    }
    return complaint;
  }

  async startProcessing(id: string, managerId: string): Promise<Complaint> {
    const complaint = await this.complaintRepo.findOne({ where: { id } });
    if (!complaint) throw new NotFoundException(`Complaint ${id} not found`);
    await this.assertManagerAtBranch(managerId, complaint.branchId);

    if (complaint.status !== ComplaintStatus.Open) {
      throw new BadRequestException('Only open complaints can be marked as in progress');
    }

    await this.complaintRepo.update(id, {
      status: ComplaintStatus.InProgress,
      assignedTo: managerId,
    });

    return this.findUpdatedComplaint(id);
  }

  async resolve(id: string, dto: ResolveComplaintDto, managerId: string): Promise<Complaint> {
    const complaint = await this.complaintRepo.findOne({ where: { id } });
    if (!complaint) throw new NotFoundException(`Complaint ${id} not found`);
    await this.assertManagerAtBranch(managerId, complaint.branchId);

    if (!ACTIONABLE_STATUSES.includes(complaint.status)) {
      throw new BadRequestException('Only open or in-progress complaints can be resolved');
    }

    await this.complaintRepo.update(id, {
      status: ComplaintStatus.Resolved,
      resolutionNote: dto.resolutionNote ?? null,
      assignedTo: managerId,
      resolvedAt: new Date(),
    });

    const updated = await this.findUpdatedComplaint(id);
    this.eventEmitter.emit(COMPLAINT_EVENTS.RESOLVED, {
      complaintId: updated.id,
      customerId: updated.customerId,
      branchId: updated.branchId,
      title: updated.title,
      resolutionNote: updated.resolutionNote,
    });

    return updated;
  }

  async reject(id: string, dto: ResolveComplaintDto, managerId: string): Promise<Complaint> {
    const complaint = await this.complaintRepo.findOne({ where: { id } });
    if (!complaint) throw new NotFoundException(`Complaint ${id} not found`);
    await this.assertManagerAtBranch(managerId, complaint.branchId);

    if (!ACTIONABLE_STATUSES.includes(complaint.status)) {
      throw new BadRequestException('Only open or in-progress complaints can be rejected');
    }

    await this.complaintRepo.update(id, {
      status: ComplaintStatus.Rejected,
      resolutionNote: dto.resolutionNote ?? null,
      assignedTo: managerId,
      resolvedAt: new Date(),
    });

    const updated = await this.findUpdatedComplaint(id);
    this.eventEmitter.emit(COMPLAINT_EVENTS.REJECTED, {
      complaintId: updated.id,
      customerId: updated.customerId,
      branchId: updated.branchId,
      title: updated.title,
      resolutionNote: updated.resolutionNote,
    });

    return updated;
  }

  private async assertManagerAtBranch(managerId: string, branchId: string): Promise<void> {
    const assignment = await this.branchStaffRepo.findOne({
      where: { userId: managerId, branchId, status: StaffStatus.Active },
    });
    if (!assignment) throw new ForbiddenException('You are not an active manager at this branch');
  }

  private async findUpdatedComplaint(id: string, relations: string[] = ['customer']): Promise<Complaint> {
    const complaint = await this.complaintRepo.findOne({ where: { id }, relations });
    if (!complaint) throw new NotFoundException(`Complaint ${id} not found`);
    return complaint;
  }
}

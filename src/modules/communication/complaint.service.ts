import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Complaint } from './entities/complaint.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { ComplaintStatus } from './enums/complaint-status.enum';
import { ResolveComplaintDto } from './dto/resolve-complaint.dto';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { NotificationService } from 'src/modules/notification/notification.service';
import { NotificationGateway } from 'src/modules/notification/notification.gateway';
import { NotificationChannel } from 'src/modules/notification/entities/notification.entity';

const ACTIONABLE_STATUSES = [ComplaintStatus.Open, ComplaintStatus.InProgress];

@Injectable()
export class ComplaintService {
  constructor(
    @InjectRepository(Complaint)
    private readonly complaintRepo: Repository<Complaint>,
    @InjectRepository(BranchStaff)
    private readonly branchStaffRepo: Repository<BranchStaff>,
    private readonly notificationService: NotificationService,
    private readonly gateway: NotificationGateway,
  ) {}

  // Create complaint (Customer)
  async create(dto: CreateComplaintDto, customerId: string): Promise<Complaint> {
    const complaint = this.complaintRepo.create({
      customerId,
      branchId: dto.branchId,
      bookingId: dto.bookingId ?? null,
      title: dto.title,
      description: dto.description,
      status: ComplaintStatus.Open,
    });
    return this.complaintRepo.save(complaint);
  }

  // List complaints for a customer
  async listByCustomer(customerId: string): Promise<Complaint[]> {
    return this.complaintRepo.find({
      where: { customerId },
      relations: ['branch', 'booking'],
      order: { createdAt: 'DESC' },
    });
  }

  // UC29 — List complaints at branch
  async listByBranch(branchId: string, managerId: string, status?: ComplaintStatus): Promise<Complaint[]> {
    await this.assertManagerAtBranch(managerId, branchId);

    const where: Record<string, unknown> = { branchId };
    if (status) where.status = status;

    return this.complaintRepo.find({
      where,
      relations: ['customer'],
      order: { createdAt: 'DESC' },
    });
  }

  // UC29 — View complaint detail
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

  // UC29 — Resolve complaint
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

    const notif = await this.notificationService.create({
      recipientUserId: complaint.customerId,
      notificationType: 'complaint_resolved',
      message: `Khiếu nại "${complaint.title}" của bạn đã được giải quyết: ${dto.resolutionNote ?? ''}`,
      channel: NotificationChannel.InApp,
      relatedEntityType: 'complaint',
      relatedEntityId: complaint.id,
    });
    this.gateway.sendToUser(complaint.customerId, notif);

    return this.complaintRepo.findOne({ where: { id }, relations: ['customer'] }) as Promise<Complaint>;
  }

  // UC29 — Reject complaint
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

    const notif = await this.notificationService.create({
      recipientUserId: complaint.customerId,
      notificationType: 'complaint_rejected',
      message: `Khiếu nại "${complaint.title}" của bạn đã được từ chối: ${dto.resolutionNote ?? ''}`,
      channel: NotificationChannel.InApp,
      relatedEntityType: 'complaint',
      relatedEntityId: complaint.id,
    });
    this.gateway.sendToUser(complaint.customerId, notif);

    return this.complaintRepo.findOne({ where: { id }, relations: ['customer'] }) as Promise<Complaint>;
  }

  private async assertManagerAtBranch(managerId: string, branchId: string): Promise<void> {
    const assignment = await this.branchStaffRepo.findOne({
      where: { userId: managerId, branchId, status: StaffStatus.Active },
    });
    if (!assignment) throw new ForbiddenException('You are not an active manager at this branch');
  }
}

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { HealthRecord } from './entities/health-record.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { UpsertHealthRecordDto } from './dto/upsert-health-record.dto';

@Injectable()
export class HealthService {
  constructor(
    @InjectRepository(HealthRecord)
    private readonly healthRepo: Repository<HealthRecord>,
    @InjectRepository(BranchStaff)
    private readonly branchStaffRepo: Repository<BranchStaff>,
  ) {}

  // Customer self-access — returns all health records belonging to the caller
  async findMyRecord(customerId: string): Promise<HealthRecord[]> {
    return this.healthRepo.find({
      where: { customerId },
      order: { createdAt: 'ASC' },
    });
  }

  // UC20 — View customer health records — Staff/Manager scoped to their branches; Owner sees all
  async findByCustomer(customerId: string, requesterId: string, requesterRole: string): Promise<HealthRecord[]> {
    if (requesterRole === UserRole.Owner) {
      return this.healthRepo.find({
        where: { customerId },
        order: { createdAt: 'ASC' },
      });
    }

    const assignments = await this.branchStaffRepo.find({
      where: { userId: requesterId, status: StaffStatus.Active },
      select: ['branchId'],
    });
    if (assignments.length === 0) {
      throw new ForbiddenException('You are not an active staff member at any branch');
    }
    const branchIds = assignments.map(a => a.branchId);
    return this.healthRepo.find({
      where: { customerId, branchId: In(branchIds) },
      order: { createdAt: 'ASC' },
    });
  }

  // UC20 — Upsert customer health record (staff)
  async upsert(customerId: string, dto: UpsertHealthRecordDto, staffId: string): Promise<HealthRecord> {
    // 1. Staff must be active at the specified branch
    const assignment = await this.branchStaffRepo.findOne({
      where: { userId: staffId, branchId: dto.branchId, status: StaffStatus.Active },
    });
    if (!assignment) {
      throw new ForbiddenException('You are not an active staff member at this branch');
    }

    // 2. Find existing record for this customer + branch
    const existing = await this.healthRepo.findOne({
      where: { customerId, branchId: dto.branchId },
    });

    if (existing) {
      // Use !== undefined so sending null explicitly clears the field (??  would keep the old value)
      await this.healthRepo.update(existing.id, {
        skinType: dto.skinType === undefined ? existing.skinType : dto.skinType,
        allergies: dto.allergies === undefined ? existing.allergies : dto.allergies,
        medicalConditions: dto.medicalConditions === undefined ? existing.medicalConditions : dto.medicalConditions,
        pregnancyStatus: dto.pregnancyStatus === undefined ? existing.pregnancyStatus : dto.pregnancyStatus,
        contraindications: dto.contraindications === undefined ? existing.contraindications : dto.contraindications,
        notes: dto.notes === undefined ? existing.notes : dto.notes,
        updatedBy: staffId,
      });
      return this.healthRepo.findOne({ where: { id: existing.id } }) as Promise<HealthRecord>;
    }

    // 3. Verify customer exists before inserting (prevents unhandled FK violation)
    const customerExists = await this.healthRepo.manager.findOne(User, { where: { id: customerId } });
    if (!customerExists) throw new NotFoundException(`Customer ${customerId} not found`);

    return this.healthRepo.save(
      this.healthRepo.create({
        customerId,
        branchId: dto.branchId,
        skinType: dto.skinType ?? null,
        allergies: dto.allergies ?? null,
        medicalConditions: dto.medicalConditions ?? null,
        pregnancyStatus: dto.pregnancyStatus ?? null,
        contraindications: dto.contraindications ?? null,
        notes: dto.notes ?? null,
        createdBy: staffId,
        updatedBy: staffId,
      }),
    );
  }
}

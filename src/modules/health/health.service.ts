import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HealthRecord } from './entities/health-record.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { UpsertHealthRecordDto } from './dto/upsert-health-record.dto';

@Injectable()
export class HealthService {
  constructor(
    @InjectRepository(HealthRecord)
    private readonly healthRepo: Repository<HealthRecord>,
    @InjectRepository(BranchStaff)
    private readonly branchStaffRepo: Repository<BranchStaff>,
  ) {}

  // UC20 — View customer health records (staff)
  async findByCustomer(customerId: string): Promise<HealthRecord[]> {
    return this.healthRepo.find({
      where: { customerId },
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
      // Update in place
      await this.healthRepo.update(existing.id, {
        skinType: dto.skinType ?? existing.skinType,
        allergies: dto.allergies ?? existing.allergies,
        medicalConditions: dto.medicalConditions ?? existing.medicalConditions,
        pregnancyStatus: dto.pregnancyStatus ?? existing.pregnancyStatus,
        contraindications: dto.contraindications ?? existing.contraindications,
        notes: dto.notes ?? existing.notes,
        updatedBy: staffId,
      });
      return this.healthRepo.findOne({ where: { id: existing.id } }) as Promise<HealthRecord>;
    }

    // 3. Create new record
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
        updatedBy: null,
      }),
    );
  }
}

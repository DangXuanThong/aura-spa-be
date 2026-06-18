import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BookingSlotConfig } from 'src/modules/booking/entities/booking-slot-config.entity';
import { BranchStaff } from './entities/branch-staff.entity';
import { StaffStatus } from './enums/staff-status.enum';
import { UpdateSlotConfigDto } from './dto/update-slot-config.dto';

@Injectable()
export class SlotConfigService {
  constructor(
    @InjectRepository(BookingSlotConfig)
    private readonly slotConfigRepo: Repository<BookingSlotConfig>,
    @InjectRepository(BranchStaff)
    private readonly branchStaffRepo: Repository<BranchStaff>,
  ) {}

  // UC27 — List slot configs for a branch
  async list(branchId: string, managerId: string): Promise<BookingSlotConfig[]> {
    await this.assertManagerAtBranch(managerId, branchId);

    return this.slotConfigRepo.find({
      where: { branchId },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  // UC27 — Update a slot config (max bookings, slot interval, hours)
  async update(branchId: string, id: string, dto: UpdateSlotConfigDto, managerId: string): Promise<BookingSlotConfig> {
    await this.assertManagerAtBranch(managerId, branchId);

    const config = await this.slotConfigRepo.findOne({ where: { id, branchId } });
    if (!config) throw new NotFoundException('Slot config not found for this branch');

    if (dto.startTime !== undefined && dto.endTime !== undefined && dto.endTime <= dto.startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }
    if (dto.startTime !== undefined && dto.endTime === undefined && dto.endTime! <= dto.startTime) {
      throw new BadRequestException('endTime must be after startTime');
    }

    const updates: Partial<BookingSlotConfig> = {};
    if (dto.maxBookings !== undefined) updates.maxBookings = dto.maxBookings;
    if (dto.slotMinutes !== undefined) updates.slotMinutes = dto.slotMinutes;
    if (dto.startTime !== undefined) updates.startTime = dto.startTime;
    if (dto.endTime !== undefined) updates.endTime = dto.endTime;
    if (dto.effectiveTo !== undefined) updates.effectiveTo = dto.effectiveTo ? new Date(dto.effectiveTo) : null;

    await this.slotConfigRepo.update(id, updates);
    return this.slotConfigRepo.findOne({ where: { id } }) as Promise<BookingSlotConfig>;
  }

  private async assertManagerAtBranch(managerId: string, branchId: string): Promise<void> {
    const assignment = await this.branchStaffRepo.findOne({
      where: { userId: managerId, branchId, status: StaffStatus.Active },
    });
    if (!assignment) throw new ForbiddenException('You are not an active staff member at this branch');
  }
}

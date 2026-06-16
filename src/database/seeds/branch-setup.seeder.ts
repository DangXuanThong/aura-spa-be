import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Service } from 'src/modules/service/entities/service.entity';
import { BranchOpeningHours } from 'src/modules/branch/entities/branch-opening-hours.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { BranchService as BranchServiceEntity } from 'src/modules/branch-service/entities/branch-service.entity';
import { BookingSlotConfig } from 'src/modules/booking/entities/booking-slot-config.entity';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { STAFF_ASSIGNMENTS } from './seed-data';

@Injectable()
export class BranchSetupSeeder {
  private readonly logger = new Logger(BranchSetupSeeder.name);

  constructor(
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Service) private readonly serviceRepo: Repository<Service>,
    @InjectRepository(BranchOpeningHours) private readonly openingHoursRepo: Repository<BranchOpeningHours>,
    @InjectRepository(BranchStaff) private readonly branchStaffRepo: Repository<BranchStaff>,
    @InjectRepository(BranchServiceEntity) private readonly branchServiceRepo: Repository<BranchServiceEntity>,
    @InjectRepository(BookingSlotConfig) private readonly slotConfigRepo: Repository<BookingSlotConfig>,
  ) {}

  async seed(): Promise<void> {
    const branches = await this.branchRepo.find();
    if (!branches.length) return;
    const branchMap = new Map(branches.map((b) => [b.code, b]));

    const staffUsers = await this.userRepo.find({
      where: { email: In(['thu.vo@aura-spa.com', 'duc.nguyen@aura-spa.com', 'bich.tran@aura-spa.com']) },
    });
    const staffMap = new Map(staffUsers.filter((u) => u.email !== null).map((u) => [u.email!, u]));

    const services = await this.serviceRepo.find();

    await this.seedOpeningHours(branchMap);
    await this.seedBranchStaff(branchMap, staffMap);
    await this.seedBranchServices(branchMap, services);
    await this.seedSlotConfigs(branchMap);
  }

  private async seedOpeningHours(branchMap: Map<string, Branch>): Promise<void> {
    let seeded = 0;
    for (const branch of branchMap.values()) {
      const count = await this.openingHoursRepo.count({ where: { branchId: branch.id } });
      if (count > 0) continue;

      const hours: Partial<BranchOpeningHours>[] = [];
      for (let day = 0; day <= 6; day++) {
        const isSunday = day === 0;
        hours.push({
          branchId: branch.id,
          dayOfWeek: day,
          openTime: isSunday ? '10:00:00' : '09:00:00',
          closeTime: isSunday ? '17:00:00' : '20:00:00',
          isClosed: false,
        });
      }
      await this.openingHoursRepo.save(hours.map((h) => this.openingHoursRepo.create(h)));
      seeded++;
    }
    if (seeded > 0) this.logger.log(`Seeded opening hours for ${seeded} branch(es)`);
    else this.logger.log('Opening hours already exist — skipping');
  }

  private async seedBranchStaff(branchMap: Map<string, Branch>, staffMap: Map<string, User>): Promise<void> {
    let seeded = 0;
    for (const a of STAFF_ASSIGNMENTS) {
      const user = staffMap.get(a.email);
      const branch = branchMap.get(a.branchCode);
      if (!user || !branch) continue;

      const exists = await this.branchStaffRepo.findOne({ where: { branchId: branch.id, userId: user.id } });
      if (exists) continue;

      await this.branchStaffRepo.save(
        this.branchStaffRepo.create({
          branchId: branch.id,
          userId: user.id,
          staffCode: a.staffCode,
          position: a.position,
          status: StaffStatus.Active,
          startDate: new Date('2025-01-01'),
          endDate: null,
        }),
      );
      seeded++;
    }

    if (seeded > 0) this.logger.log(`Seeded ${seeded} branch-staff assignment(s)`);
    else this.logger.log('Branch staff already assigned — skipping');
  }

  private async seedBranchServices(branchMap: Map<string, Branch>, services: Service[]): Promise<void> {
    let seeded = 0;
    for (const branch of branchMap.values()) {
      for (const service of services) {
        const exists = await this.branchServiceRepo.findOne({ where: { branchId: branch.id, serviceId: service.id } });
        if (exists) continue;

        await this.branchServiceRepo.save(
          this.branchServiceRepo.create({
            branchId: branch.id,
            serviceId: service.id,
            isEnabled: true,
            durationMinutesOverride: null,
            priceOverride: null,
            maxParallelBookings: null,
          }),
        );
        seeded++;
      }
    }

    if (seeded > 0) this.logger.log(`Seeded ${seeded} branch-service record(s)`);
    else this.logger.log('Branch services already seeded — skipping');
  }

  private async seedSlotConfigs(branchMap: Map<string, Branch>): Promise<void> {
    let seeded = 0;
    for (const branch of branchMap.values()) {
      const count = await this.slotConfigRepo.count({ where: { branchId: branch.id } });
      if (count > 0) continue;

      const configs: Partial<BookingSlotConfig>[] = [];
      for (let day = 0; day <= 6; day++) {
        const isSunday = day === 0;
        configs.push({
          branchId: branch.id,
          dayOfWeek: day,
          startTime: isSunday ? '10:00:00' : '09:00:00',
          endTime: isSunday ? '17:00:00' : '20:00:00',
          slotMinutes: 60,
          maxBookings: isSunday ? 2 : 3,
          effectiveFrom: new Date('2025-01-01'),
          effectiveTo: null,
        });
      }
      await this.slotConfigRepo.save(configs.map((c) => this.slotConfigRepo.create(c)));
      seeded++;
    }

    if (seeded > 0) this.logger.log(`Seeded slot configs for ${seeded} branch(es)`);
    else this.logger.log('Slot configs already exist — skipping');
  }
}

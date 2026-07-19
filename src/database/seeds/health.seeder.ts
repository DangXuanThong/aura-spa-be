import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { HealthRecord } from 'src/modules/health/entities/health-record.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { HEALTH_DEFS } from './seed-data';

@Injectable()
export class HealthSeeder {
  private readonly logger = new Logger(HealthSeeder.name);

  constructor(
    @InjectRepository(HealthRecord) private readonly healthRepo: Repository<HealthRecord>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
  ) {}

  async seed(): Promise<void> {
    const owner = await this.userRepo.findOne({ where: { email: 'owner@gmail.com' } });
    if (!owner) return;

    const customerEmails = HEALTH_DEFS.map((d) => d.customerEmail);
    const customers = await this.userRepo.find({ where: { email: In(customerEmails) } });
    const customerMap = new Map(customers.map((u) => [u.email, u]));

    const branches = await this.branchRepo.find();
    const branchMap = new Map(branches.map((b) => [b.code, b]));

    let seeded = 0;
    for (const def of HEALTH_DEFS) {
      const customer = customerMap.get(def.customerEmail);
      const branch = branchMap.get(def.branchCode);
      if (!customer) continue;

      const existing = await this.healthRepo.findOne({
        where: { customerId: customer.id, branchId: branch?.id ?? undefined },
      });
      if (existing) continue;

      await this.healthRepo.save(
        this.healthRepo.create({
          customerId: customer.id,
          branchId: branch?.id ?? null,
          skinType: def.skinType,
          allergies: def.allergies,
          medicalConditions: def.medicalConditions,
          pregnancyStatus: def.pregnancyStatus,
          contraindications: def.contraindications,
          notes: def.notes,
          createdBy: owner.id,
          updatedBy: null,
        }),
      );
      seeded++;
    }

    this.logger.log(`Seeded ${seeded} health record(s)`);
  }
}

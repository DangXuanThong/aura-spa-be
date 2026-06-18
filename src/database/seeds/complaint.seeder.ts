import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Complaint } from 'src/modules/communication/entities/complaint.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { COMPLAINT_DEFS } from './seed-data';

@Injectable()
export class ComplaintSeeder {
  private readonly logger = new Logger(ComplaintSeeder.name);

  constructor(
    @InjectRepository(Complaint)
    private readonly complaintRepo: Repository<Complaint>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async seed(): Promise<void> {
    const count = await this.complaintRepo.count();
    if (count > 0) {
      this.logger.log('Complaints already exist — skipping');
      return;
    }

    const branches = await this.branchRepo.find();
    const branchByCode = new Map(branches.map((b) => [b.code, b]));

    const users = await this.userRepo.find();
    const userByEmail = new Map(users.filter((u) => u.email !== null).map((u) => [u.email!, u]));

    let seeded = 0;
    for (const def of COMPLAINT_DEFS) {
      const branch = branchByCode.get(def.branchCode);
      const customer = userByEmail.get(def.customerEmail);
      if (!branch || !customer) continue;

      await this.complaintRepo.save(
        this.complaintRepo.create({
          customerId: customer.id,
          branchId: branch.id,
          bookingId: null,
          title: def.title,
          description: def.description,
          status: def.status,
          assignedTo: null,
          resolutionNote: def.resolutionNote,
          resolvedAt: def.resolvedAt,
        }),
      );
      seeded++;
    }

    this.logger.log(`Seeded ${seeded} complaint(s)`);
  }
}

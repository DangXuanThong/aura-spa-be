import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ScheduleRequest } from 'src/modules/schedule/entities/schedule-request.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { ApprovalStatus } from 'src/modules/schedule/enums/approval-status.enum';
import { SCHEDULE_DEFS } from './seed-data';

const STAFF_EMAILS = SCHEDULE_DEFS.map((d) => d.staffEmail);

@Injectable()
export class ScheduleSeeder {
  private readonly logger = new Logger(ScheduleSeeder.name);

  constructor(
    @InjectRepository(ScheduleRequest) private readonly requestRepo: Repository<ScheduleRequest>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
  ) {}

  async seed(): Promise<void> {
    const users = await this.userRepo.find({ where: { email: In(STAFF_EMAILS) } });
    const userMap = new Map(users.map((u) => [u.email, u]));

    const branches = await this.branchRepo.find();
    const branchMap = new Map(branches.map((b) => [b.code, b]));

    const owner = await this.userRepo.findOne({ where: { email: 'owner@gmail.com' } });

    let seededRequests = 0;

    for (const def of SCHEDULE_DEFS) {
      const staff = userMap.get(def.staffEmail);
      const branch = branchMap.get(def.branchCode);
      if (!staff || !branch) continue;

      for (const req of def.requests) {
        const exists = await this.requestRepo.findOne({
          where: {
            staffId: staff.id,
            branchId: branch.id,
            requestType: req.requestType,
            requestedStart: req.requestedStart,
            requestedEnd: req.requestedEnd,
          },
        });
        if (exists) continue;

        await this.requestRepo.save(
          this.requestRepo.create({
            staffId: staff.id,
            branchId: branch.id,
            requestType: req.requestType,
            requestedStart: req.requestedStart,
            requestedEnd: req.requestedEnd,
            status: req.status,
            reason: req.reason,
            reviewedBy: req.status === ApprovalStatus.Approved ? (owner?.id ?? null) : null,
            reviewedAt: req.status === ApprovalStatus.Approved ? new Date() : null,
          }),
        );
        seededRequests++;
      }
    }

    if (seededRequests > 0) this.logger.log(`Seeded ${seededRequests} schedule request(s)`);
    else this.logger.log('Schedule requests already exist - skipping');
  }
}

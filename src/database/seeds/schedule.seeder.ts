import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ScheduleRequest } from 'src/modules/schedule/entities/schedule-request.entity';
import { StaffSchedule } from 'src/modules/schedule/entities/staff-schedule';
import { User } from 'src/modules/user/entities/user.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { ScheduleType } from 'src/modules/schedule/enums/schedule-type.enum';
import { ScheduleStatus } from 'src/modules/schedule/enums/schedule-status.enum';
import { ApprovalStatus } from 'src/modules/schedule/enums/approval-status.enum';
import { SCHEDULE_DEFS } from './seed-data';

const STAFF_EMAILS = SCHEDULE_DEFS.map((d) => d.staffEmail);

@Injectable()
export class ScheduleSeeder {
  private readonly logger = new Logger(ScheduleSeeder.name);

  constructor(
    @InjectRepository(ScheduleRequest) private readonly requestRepo: Repository<ScheduleRequest>,
    @InjectRepository(StaffSchedule) private readonly scheduleRepo: Repository<StaffSchedule>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
  ) {}

  async seed(): Promise<void> {
    const count = await this.requestRepo.count();
    if (count > 0) {
      this.logger.log('Schedule requests already exist — skipping');
      return;
    }

    const users = await this.userRepo.find({ where: { email: In(STAFF_EMAILS) } });
    const userMap = new Map(users.map((u) => [u.email, u]));

    const branches = await this.branchRepo.find();
    const branchMap = new Map(branches.map((b) => [b.code, b]));

    const owner = await this.userRepo.findOne({ where: { email: 'owner@gmail.com' } });

    let seededRequests = 0;
    let seededShifts = 0;

    for (const def of SCHEDULE_DEFS) {
      const staff = userMap.get(def.staffEmail);
      const branch = branchMap.get(def.branchCode);
      if (!staff || !branch) continue;

      for (const req of def.requests) {
        const savedRequest = await this.requestRepo.save(
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

        const MS_PER_DAY = 24 * 60 * 60 * 1000;
        const shiftDurationMs = (req.requestedEnd.getUTCHours() - req.requestedStart.getUTCHours()) * 60 * 60 * 1000;

        for (const day of req.shiftDays) {
          const startTime = new Date(req.requestedStart.getTime() + day * MS_PER_DAY);
          const endTime = new Date(startTime.getTime() + shiftDurationMs);

          await this.scheduleRepo.save(
            this.scheduleRepo.create({
              staffId: staff.id,
              branchId: branch.id,
              startTime,
              endTime,
              scheduleType: ScheduleType.Working,
              status: ScheduleStatus.Active,
              sourceRequestId: savedRequest.id,
              createdBy: owner?.id ?? null,
            }),
          );
          seededShifts++;
        }
      }
    }

    this.logger.log(`Seeded ${seededRequests} schedule request(s) and ${seededShifts} shift(s)`);
  }
}

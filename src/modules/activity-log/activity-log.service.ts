import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThan, Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { ActivityLog } from './entities/activity-log.entity';

export interface LogParams {
  userId?: string;
  userRole?: string;
  branchId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}

export interface ActivityLogQuery {
  userId?: string;
  branchId?: string;
  action?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}

const RETENTION_DAYS = 90;

@Injectable()
export class ActivityLogService {
  private readonly logger = new Logger(ActivityLogService.name);

  constructor(
    @InjectRepository(ActivityLog)
    private readonly repo: Repository<ActivityLog>,
  ) {}

  // Fire-and-forget — never blocks the caller
  log(params: LogParams): void {
    this.repo
      .save(
        this.repo.create({
          userId: params.userId ?? null,
          userRole: params.userRole ?? null,
          branchId: params.branchId ?? null,
          action: params.action,
          entityType: params.entityType ?? null,
          entityId: params.entityId ?? null,
          metadata: params.metadata ?? null,
          ipAddress: params.ipAddress ?? null,
          occurredAt: new Date(),
        }),
      )
      .catch(() => undefined);
  }

  // BUG-117 — Owner/Admin audit trail read API
  findAll(query: ActivityLogQuery): Promise<ActivityLog[]> {
    const where: Record<string, unknown> = {};
    if (query.userId) where.userId = query.userId;
    if (query.branchId) where.branchId = query.branchId;
    if (query.action) where.action = query.action;
    if (query.from && query.to) where.occurredAt = Between(query.from, query.to);
    else if (query.from) where.occurredAt = Between(query.from, new Date());

    return this.repo.find({
      where,
      order: { occurredAt: 'DESC' },
      take: Math.min(query.limit ?? 100, 500),
    });
  }

  // BUG-118 — Delete logs older than RETENTION_DAYS daily at 02:10 UTC
  @Cron('10 2 * * *')
  async purgeOldLogs(): Promise<void> {
    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const result = await this.repo.delete({ occurredAt: LessThan(cutoff) });
    if (result.affected) {
      this.logger.log(`Purged ${result.affected} activity log(s) older than ${RETENTION_DAYS} days`);
    }
  }
}

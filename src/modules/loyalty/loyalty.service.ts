import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { LoyaltyAccount } from './entities/loyalty-account.entity';
import { LoyaltyTransaction } from './entities/loyalty-transaction.entity';
import { LoyaltyTransactionType } from './enums/loyalty-transaction-type.enum';
import { LoyaltySummaryDto } from './dto/loyalty-summary.dto';

const EARN_RATE_VND = 10000;
const TIERS = [
  { name: 'Aura Platinum', minPoints: 3000 },
  { name: 'Aura Gold', minPoints: 1000 },
  { name: 'Aura Member', minPoints: 0 },
];

export interface AwardPaymentPointsInput {
  customerId: string;
  bookingId?: string | null;
  paymentId: string;
  amount: number;
  source: string;
  description?: string | null;
  manager?: EntityManager;
}

@Injectable()
export class LoyaltyService {
  constructor(
    @InjectRepository(LoyaltyAccount)
    private readonly accountRepo: Repository<LoyaltyAccount>,
    @InjectRepository(LoyaltyTransaction)
    private readonly transactionRepo: Repository<LoyaltyTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  async getSummary(customerId: string): Promise<LoyaltySummaryDto> {
    const account = await this.getOrCreateAccount(customerId);
    const transactions = await this.transactionRepo.find({
      where: { accountId: account.id },
      order: { createdAt: 'DESC' },
      take: 8,
    });

    const nextTier = this.getNextTier(account.lifetimePoints);

    return {
      tier: account.tier,
      pointsBalance: account.pointsBalance,
      lifetimePoints: account.lifetimePoints,
      earnRateVnd: EARN_RATE_VND,
      nextTier: nextTier?.name ?? null,
      nextTierPoints: nextTier ? Math.max(0, nextTier.minPoints - account.lifetimePoints) : null,
      transactions: transactions.map((transaction) => ({
        id: transaction.id,
        bookingId: transaction.bookingId,
        paymentId: transaction.paymentId,
        type: transaction.type,
        points: transaction.points,
        source: transaction.source,
        description: transaction.description,
        createdAt: transaction.createdAt,
      })),
    };
  }

  async awardForPayment(input: AwardPaymentPointsInput): Promise<void> {
    const points = Math.floor(Number(input.amount) / EARN_RATE_VND);
    if (!input.customerId || !input.paymentId || points <= 0) {
      return;
    }

    const runner = async (manager: EntityManager) => {
      const transactionRepo = manager.getRepository(LoyaltyTransaction);
      const existing = await transactionRepo.findOne({ where: { paymentId: input.paymentId } });
      if (existing) {
        return;
      }

      const account = await this.getOrCreateAccount(input.customerId, manager);
      const nextLifetimePoints = account.lifetimePoints + points;
      const tier = this.resolveTier(nextLifetimePoints);

      await manager.update(LoyaltyAccount, account.id, {
        pointsBalance: account.pointsBalance + points,
        lifetimePoints: nextLifetimePoints,
        tier,
      });

      await transactionRepo.save(
        transactionRepo.create({
          accountId: account.id,
          customerId: input.customerId,
          bookingId: input.bookingId ?? null,
          paymentId: input.paymentId,
          type: LoyaltyTransactionType.Earn,
          points,
          source: input.source,
          description: input.description ?? null,
        }),
      );
    };

    if (input.manager) {
      await runner(input.manager);
      return;
    }

    await this.dataSource.transaction(runner);
  }

  private async getOrCreateAccount(customerId: string, manager?: EntityManager): Promise<LoyaltyAccount> {
    const repo = manager?.getRepository(LoyaltyAccount) ?? this.accountRepo;
    let account = await repo.findOne({ where: { customerId } });
    if (account) {
      return account;
    }

    account = repo.create({
      customerId,
      tier: 'Aura Member',
      pointsBalance: 0,
      lifetimePoints: 0,
    });

    try {
      return await repo.save(account);
    } catch (error) {
      const created = await repo.findOne({ where: { customerId } });
      if (created) {
        return created;
      }
      throw error;
    }
  }

  private resolveTier(lifetimePoints: number): string {
    return TIERS.find((tier) => lifetimePoints >= tier.minPoints)?.name ?? 'Aura Member';
  }

  private getNextTier(lifetimePoints: number): { name: string; minPoints: number } | null {
    const ascending = [...TIERS].sort((a, b) => a.minPoints - b.minPoints);
    return ascending.find((tier) => lifetimePoints < tier.minPoints) ?? null;
  }
}

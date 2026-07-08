import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { LoyaltyAccount } from './entities/loyalty-account.entity';
import { LoyaltyTransaction } from './entities/loyalty-transaction.entity';
import { LoyaltyTransactionType } from './enums/loyalty-transaction-type.enum';
import { LoyaltySummaryDto, RedeemPointsResponseDto } from './dto/loyalty-summary.dto';

const EARN_RATE_VND = 10000;
const REDEEM_VALUE_VND = 1000;
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

export interface RevokeRefundPointsInput {
  customerId: string;
  bookingId?: string | null;
  paymentId: string;
  originalAmount: number;
  totalRefundedAmount: number;
  reason?: string | null;
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
      redeemValueVnd: REDEEM_VALUE_VND,
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

  async redeemPoints(customerId: string, points: number, description?: string | null): Promise<RedeemPointsResponseDto> {
    if (points <= 0) {
      throw new BadRequestException('Points to redeem must be greater than zero');
    }

    return this.dataSource.transaction(async (manager) => {
      const account = await this.getOrCreateAccount(customerId, manager);
      const lockedAccount = await manager.findOne(LoyaltyAccount, {
        where: { id: account.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedAccount) {
        throw new BadRequestException('Loyalty account not found');
      }

      if (lockedAccount.pointsBalance < points) {
        throw new BadRequestException('Not enough loyalty points to redeem');
      }

      const nextBalance = lockedAccount.pointsBalance - points;
      await manager.update(LoyaltyAccount, lockedAccount.id, {
        pointsBalance: nextBalance,
      });

      await manager.getRepository(LoyaltyTransaction).save(
        manager.getRepository(LoyaltyTransaction).create({
          accountId: lockedAccount.id,
          customerId,
          bookingId: null,
          paymentId: null,
          type: LoyaltyTransactionType.Redeem,
          points: -points,
          source: 'points_redemption',
          description: description ?? `Redeemed ${points} loyalty points`,
        }),
      );

      return {
        pointsRedeemed: points,
        valueVnd: points * REDEEM_VALUE_VND,
        pointsBalance: nextBalance,
        tier: lockedAccount.tier,
      };
    });
  }

  async revokeForRefund(input: RevokeRefundPointsInput): Promise<void> {
    if (!input.customerId || !input.paymentId || input.originalAmount <= 0 || input.totalRefundedAmount <= 0) {
      return;
    }

    const runner = async (manager: EntityManager) => {
      const transactionRepo = manager.getRepository(LoyaltyTransaction);
      const earnTransaction = await transactionRepo.findOne({
        where: {
          paymentId: input.paymentId,
          type: LoyaltyTransactionType.Earn,
        },
      });
      if (!earnTransaction || earnTransaction.points <= 0) {
        return;
      }

      const refundSource = `refund:${input.paymentId}`;
      const existingRefundRows = await transactionRepo.find({
        where: {
          customerId: input.customerId,
          source: refundSource,
          type: LoyaltyTransactionType.Adjust,
        },
      });
      const alreadyRevoked = existingRefundRows.reduce((sum, transaction) => sum + Math.abs(transaction.points), 0);
      const refundRatio = Math.min(1, input.totalRefundedAmount / input.originalAmount);
      const shouldHaveRevoked = Math.floor(earnTransaction.points * refundRatio);
      const pointsToRevoke = Math.max(0, Math.min(earnTransaction.points - alreadyRevoked, shouldHaveRevoked - alreadyRevoked));

      if (pointsToRevoke <= 0) {
        return;
      }

      const account = await this.getOrCreateAccount(input.customerId, manager);
      const lockedAccount = await manager.findOne(LoyaltyAccount, {
        where: { id: account.id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedAccount) {
        return;
      }

      const nextLifetimePoints = Math.max(0, lockedAccount.lifetimePoints - pointsToRevoke);
      const nextBalance = Math.max(0, lockedAccount.pointsBalance - pointsToRevoke);

      await manager.update(LoyaltyAccount, lockedAccount.id, {
        pointsBalance: nextBalance,
        lifetimePoints: nextLifetimePoints,
        tier: this.resolveTier(nextLifetimePoints),
      });

      await transactionRepo.save(
        transactionRepo.create({
          accountId: lockedAccount.id,
          customerId: input.customerId,
          bookingId: input.bookingId ?? earnTransaction.bookingId,
          paymentId: null,
          type: LoyaltyTransactionType.Adjust,
          points: -pointsToRevoke,
          source: refundSource,
          description: input.reason ?? `Reversed loyalty points for refunded payment #${input.paymentId}`,
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

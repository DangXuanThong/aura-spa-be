import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promotion } from 'src/modules/promotion/entities/promotion.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { PROMOTIONS } from './seed-data';

@Injectable()
export class PromotionSeeder {
  private readonly logger = new Logger(PromotionSeeder.name);

  constructor(
    @InjectRepository(Promotion)
    private readonly promotionRepo: Repository<Promotion>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
  ) {}

  async seed(): Promise<void> {
    const count = await this.promotionRepo.count();
    if (count > 0) {
      this.logger.log('Promotions already exist — skipping');
      return;
    }

    const branches = await this.branchRepo.find();
    const branchByCode = new Map(branches.map((b) => [b.code, b]));

    let seeded = 0;
    for (const def of PROMOTIONS) {
      const branchId = def.branchCode ? (branchByCode.get(def.branchCode)?.id ?? null) : null;

      await this.promotionRepo.save(
        this.promotionRepo.create({
          code: def.code,
          name: def.name,
          description: def.description,
          branchId,
          discountType: def.discountType,
          discountValue: def.discountValue,
          maxDiscountAmount: def.maxDiscountAmount,
          minOrderAmount: def.minOrderAmount,
          usageLimitTotal: def.usageLimitTotal,
          usageLimitPerCustomer: def.usageLimitPerCustomer,
          eligibleCustomerTier: def.eligibleCustomerTier,
          minPointsBalance: def.minPointsBalance,
          firstBookingOnly: def.firstBookingOnly,
          startsAt: def.startsAt,
          endsAt: def.endsAt,
          status: def.status,
        }),
      );
      seeded++;
    }

    this.logger.log(`Seeded ${seeded} promotion(s)`);
  }
}

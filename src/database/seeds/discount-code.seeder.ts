import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiscountCode } from 'src/modules/promotion/entities/discount-code.entity';
import { Promotion } from 'src/modules/promotion/entities/promotion.entity';
import { DISCOUNT_CODES } from './seed-data';

@Injectable()
export class DiscountCodeSeeder {
  private readonly logger = new Logger(DiscountCodeSeeder.name);

  constructor(
    @InjectRepository(DiscountCode) private readonly discountCodeRepo: Repository<DiscountCode>,
    @InjectRepository(Promotion) private readonly promotionRepo: Repository<Promotion>,
  ) {}

  async seed(): Promise<void> {
    const promotions = await this.promotionRepo.find();
    const promotionByCode = new Map(promotions.map((p) => [p.code, p]));

    let seeded = 0;
    for (const def of DISCOUNT_CODES) {
      const exists = await this.discountCodeRepo.findOne({ where: { code: def.code } });
      if (exists) continue;

      const promotion = promotionByCode.get(def.promotionCode);
      if (!promotion) continue;

      await this.discountCodeRepo.save(
        this.discountCodeRepo.create({
          promotionId: promotion.id,
          code: def.code,
          usageLimitTotal: def.usageLimitTotal,
          usageLimitPerCustomer: def.usageLimitPerCustomer,
          usedCount: 0,
          status: def.status,
        }),
      );
      seeded++;
    }

    if (seeded > 0) this.logger.log(`Seeded ${seeded} discount code(s)`);
    else this.logger.log('Discount codes already exist — skipping');
  }
}

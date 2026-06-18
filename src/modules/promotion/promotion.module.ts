import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Promotion } from './entities/promotion.entity';
import { DiscountCode } from './entities/discount-code.entity';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Promotion, DiscountCode]), AuthModule],
  controllers: [PromotionController],
  providers: [PromotionService, RolesGuard],
  exports: [PromotionService],
})
export class PromotionModule {}

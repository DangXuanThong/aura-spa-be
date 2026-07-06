import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/modules/auth/auth.module';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { LoyaltyAccount } from './entities/loyalty-account.entity';
import { LoyaltyTransaction } from './entities/loyalty-transaction.entity';
import { LoyaltyController } from './loyalty.controller';
import { LoyaltyService } from './loyalty.service';

@Module({
  imports: [TypeOrmModule.forFeature([LoyaltyAccount, LoyaltyTransaction]), AuthModule],
  controllers: [LoyaltyController],
  providers: [LoyaltyService, RolesGuard],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}

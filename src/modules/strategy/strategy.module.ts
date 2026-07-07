import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Strategy } from './entities/strategy.entity';
import { StrategyService } from './strategy.service';
import { StrategyController } from './strategy.controller';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Strategy]), AuthModule],
  controllers: [StrategyController],
  providers: [StrategyService, RolesGuard],
  exports: [StrategyService],
})
export class StrategyModule {}

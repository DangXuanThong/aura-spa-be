import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Service } from 'src/modules/service/entities/service.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BookingService as BookingServiceEntity } from 'src/modules/booking/entities/booking-service.entity';
import { HealthRecord } from 'src/modules/health/entities/health-record.entity';
import { BookingModule } from 'src/modules/booking/booking.module';
import { BranchModule } from 'src/modules/branch/branch.module';
import { ServiceModule } from 'src/modules/service/service.module';
import { StrategyModule } from 'src/modules/strategy/strategy.module';
import { ReportModule } from 'src/modules/report/report.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { AiInvocationLog } from './entities/ai-invocation-log.entity';
import { OpenAiService } from './openai.service';
import { RecommendService } from './services/recommend.service';
import { ConciergeService } from './services/concierge.service';
import { StrategyGenerateService } from './services/strategy-generate.service';
import { AiController } from './ai.controller';
import { OptionalJwtAuthGuard } from './guards/optional-jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiInvocationLog, Service, Booking, BookingServiceEntity, HealthRecord]),
    AuthModule,
    BookingModule,
    BranchModule,
    ServiceModule,
    StrategyModule,
    ReportModule,
  ],
  controllers: [AiController],
  providers: [OpenAiService, RecommendService, ConciergeService, StrategyGenerateService, OptionalJwtAuthGuard, RolesGuard],
  exports: [OpenAiService, RecommendService, ConciergeService, StrategyGenerateService],
})
export class AiModule {}

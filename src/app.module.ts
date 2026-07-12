import { Injectable, Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { BranchModule } from './modules/branch/branch.module';
import { UserModule } from './modules/user/user.module';
import { ServiceModule } from './modules/service/service.module';
import { BranchServiceModule } from './modules/branch-service/branch-service.module';
import { PromotionModule } from './modules/promotion/promotion.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { BookingModule } from './modules/booking/booking.module';
import { HealthModule } from './modules/health/health.module';
import { TreatmentModule } from './modules/treatment/treatment.module';
import { ReviewModule } from './modules/review/review.module';
import { WorkScheduleModule } from './modules/schedule/schedule.module';
import { PaymentModule } from './modules/payment/payment.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ReportModule } from './modules/report/report.module';
import { databaseConfig } from './config/database.config';
import { sepayConfig } from './modules/payment/infrastructure/sepay/sepay.config';
import { AuthModule } from 'src/modules/auth/auth.module';
import { SeederModule } from 'src/database/seeds/seeder.module';
import { ActivityLogModule } from 'src/modules/activity-log/activity-log.module';
import { StrategyModule } from 'src/modules/strategy/strategy.module';
import { NotificationModule } from 'src/modules/notification/notification.module';
import { CaslModule } from 'src/common/casl/casl.module';
import { HealthCheckController } from './health-check.controller';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { AiModule } from './modules/ai/ai.module';

@Injectable()
class DatabaseHealthLogger implements OnModuleInit {
  private readonly logger = new Logger(DatabaseHealthLogger.name);

  constructor(private readonly dataSource: DataSource) {}

  onModuleInit(): void {
    if (this.dataSource.isInitialized) {
      this.logger.log('Database connected successfully');
    }
  }
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, sepayConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): DataSourceOptions => {
        return configService.getOrThrow<DataSourceOptions>('database');
      },
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          ttl: config.get<number>('THROTTLE_TTL', 60000),
          limit: config.get<number>('THROTTLE_LIMIT', 5),
        },
      ],
    }),
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.' }),
    UserModule,
    AuthModule,
    BranchModule,
    ServiceModule,
    BranchServiceModule,
    PromotionModule,
    CommunicationModule,
    BookingModule,
    HealthModule,
    TreatmentModule,
    ReviewModule,
    WorkScheduleModule,
    PaymentModule,
    InventoryModule,
    ReportModule,
    ActivityLogModule,
    StrategyModule,
    NotificationModule,
    LoyaltyModule,
    AiModule,
    CaslModule,
    SeederModule,
  ],
  controllers: [HealthCheckController],
  providers: [DatabaseHealthLogger],
})
export class AppModule {}

import { Injectable, Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { BranchModule } from './modules/branch/branch.module';
import { UserModule } from './modules/user/user.module';
import { ServiceModule } from './modules/service/service.module';
import { BranchServiceModule } from './modules/branch-service/branch-service.module';
import { PromotionModule } from './modules/promotion/promotion.module';
import { CommunicationModule } from './modules/communication/communication.module';
import { BookingModule } from './modules/booking/booking.module';
import { databaseConfig } from './config/database.config';
import { AuthModule } from 'src/modules/auth/auth.module';
import { SeederModule } from 'src/database/seeds/seeder.module';

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
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): DataSourceOptions => {
        return configService.getOrThrow<DataSourceOptions>('database');
      },
    }),
    ScheduleModule.forRoot(),
    UserModule,
    AuthModule,
    BranchModule,
    ServiceModule,
    BranchServiceModule,
    PromotionModule,
    CommunicationModule,
    BookingModule,
    SeederModule,
  ],
  providers: [DatabaseHealthLogger],
})
export class AppModule {}

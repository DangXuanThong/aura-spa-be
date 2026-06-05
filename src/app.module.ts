import { Injectable, Logger, Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';
import { databaseConfig } from './config/database.config';

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
      isGlobal: true, // Mọi module AURA SPA đều đọc được ConfigService.
      load: [databaseConfig],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService): DataSourceOptions => {
        return configService.getOrThrow<DataSourceOptions>('database');
      },
    }),
    ScheduleModule.forRoot(), // Chuẩn bị cho cron auto-cancel booking sau này.
  ],
  providers: [DatabaseHealthLogger],
})
export class AppModule {}

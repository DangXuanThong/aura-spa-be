import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './entities/notification.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationListener } from './notification.listener';
import { NotificationGateway } from './notification.gateway';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthModule } from 'src/modules/auth/auth.module';
import { ActivityLogModule } from 'src/modules/activity-log/activity-log.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, BranchStaff]),
    AuthModule,
    ActivityLogModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        secret: cs.getOrThrow<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, NotificationListener, NotificationGateway, RolesGuard],
  exports: [NotificationService],
})
export class NotificationModule {}

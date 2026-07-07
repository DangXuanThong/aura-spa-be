import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleRequest } from './entities/schedule-request.entity';
import { StaffSchedule } from './entities/staff-schedule.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthModule } from 'src/modules/auth/auth.module';
import { NotificationModule } from 'src/modules/notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ScheduleRequest, StaffSchedule, Booking, BranchStaff]),
    AuthModule,
    NotificationModule,
  ],
  controllers: [ScheduleController],
  providers: [ScheduleService, RolesGuard],
  exports: [ScheduleService],
})
export class WorkScheduleModule {}

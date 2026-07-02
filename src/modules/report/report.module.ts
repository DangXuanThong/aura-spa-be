import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { Review } from 'src/modules/review/entities/review.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { BranchDailyAggregate } from './entities/branch-daily-aggregate.entity';
import { StaffSchedule } from 'src/modules/schedule/entities/staff-schedule.entity';
import { Complaint } from 'src/modules/communication/entities/complaint.entity';
import { ReportController } from './report.controller';
import { ReportService } from './report.service';
import { BranchDailyAggregateService } from './branch-daily-aggregate.service';
import { CustomerBehaviorService } from './customer-behavior.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, Review, Branch, BranchStaff, BranchDailyAggregate, StaffSchedule, Complaint]),
    AuthModule,
  ],
  controllers: [ReportController],
  providers: [ReportService, BranchDailyAggregateService, CustomerBehaviorService, RolesGuard],
  exports: [BranchDailyAggregateService, CustomerBehaviorService],
})
export class ReportModule {}

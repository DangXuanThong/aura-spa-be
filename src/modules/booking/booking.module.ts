import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { BookingService as BookingServiceEntity } from './entities/booking-service.entity';
import { BookingSlotConfig } from './entities/booking-slot-config.entity';
import { BranchService as BranchServiceEntity } from 'src/modules/branch-service/entities/branch-service.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { ScheduleRequest } from 'src/modules/schedule/entities/schedule-request.entity';
import { Service } from 'src/modules/service/entities/service.entity';
import { DiscountCode } from 'src/modules/promotion/entities/discount-code.entity';
import { Promotion } from 'src/modules/promotion/entities/promotion.entity';
import { BookingController } from './booking.controller';
import { BookingAvailabilityService } from './booking-availability.service';
import { BookingService } from './booking.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthModule } from 'src/modules/auth/auth.module';
import { UserModule } from 'src/modules/user/user.module';
import { StaffSchedule } from 'src/modules/schedule/entities/staff-schedule.entity';
import { LoyaltyAccount } from 'src/modules/loyalty/entities/loyalty-account.entity';
import { TreatmentCourse } from 'src/modules/treatment/entities/treatment-course.entity';
import { TreatmentSession } from 'src/modules/treatment/entities/treatment-session.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingServiceEntity,
      BookingSlotConfig,
      BranchServiceEntity,
      Branch,
      BranchStaff,
      ScheduleRequest,
      Service,
      StaffSchedule,
      DiscountCode,
      Promotion,
      LoyaltyAccount,
      TreatmentCourse,
      TreatmentSession,
    ]),
    AuthModule,
    UserModule,
  ],
  controllers: [BookingController],
  providers: [BookingAvailabilityService, BookingService, RolesGuard],
  exports: [BookingAvailabilityService, BookingService],
})
export class BookingModule {}

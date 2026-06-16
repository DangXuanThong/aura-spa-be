import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { BookingService as BookingServiceEntity } from './entities/booking-service.entity';
import { BookingSlotConfig } from './entities/booking-slot-config.entity';
import { BranchService as BranchServiceEntity } from 'src/modules/branch-service/entities/branch-service.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { Service } from 'src/modules/service/entities/service.entity';
import { BookingController } from './booking.controller';
import { BookingAvailabilityService } from './booking-availability.service';
import { BookingService } from './booking.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Booking, BookingServiceEntity, BookingSlotConfig, BranchServiceEntity, Branch, BranchStaff, Service]),
    AuthModule,
  ],
  controllers: [BookingController],
  providers: [BookingAvailabilityService, BookingService, RolesGuard],
  exports: [BookingAvailabilityService, BookingService],
})
export class BookingModule {}

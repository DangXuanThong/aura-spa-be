import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Booking } from './entities/booking.entity';
import { BookingSlotConfig } from './entities/booking-slot-config.entity';
import { BranchService as BranchServiceEntity } from 'src/modules/branch-service/entities/branch-service.entity';
import { Service } from 'src/modules/service/entities/service.entity';
import { BookingController } from './booking.controller';
import { BookingAvailabilityService } from './booking-availability.service';

@Module({
  imports: [TypeOrmModule.forFeature([Booking, BookingSlotConfig, BranchServiceEntity, Service])],
  controllers: [BookingController],
  providers: [BookingAvailabilityService],
  exports: [BookingAvailabilityService],
})
export class BookingModule {}

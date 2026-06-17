import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BookingService as BookingServiceEntity } from 'src/modules/booking/entities/booking-service.entity';
import { ReviewController } from './review.controller';
import { ReviewService } from './review.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Review, Booking, BookingServiceEntity]), AuthModule],
  controllers: [ReviewController],
  providers: [ReviewService, RolesGuard],
  exports: [ReviewService],
})
export class ReviewModule {}

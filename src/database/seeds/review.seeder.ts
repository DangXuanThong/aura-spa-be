import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Review } from 'src/modules/review/entities/review.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BookingService as BookingServiceEntity } from 'src/modules/booking/entities/booking-service.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { ReviewStatus } from 'src/modules/review/enums/review-status.enum';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';
import { REVIEW_DEFS } from './seed-data';

@Injectable()
export class ReviewSeeder {
  private readonly logger = new Logger(ReviewSeeder.name);

  constructor(
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingServiceEntity) private readonly bookingServiceRepo: Repository<BookingServiceEntity>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async seed(): Promise<void> {
    const count = await this.reviewRepo.count();
    if (count > 0) {
      this.logger.log('Reviews already exist — skipping');
      return;
    }

    const customerEmails = REVIEW_DEFS.map((r) => r.customerEmail);
    const customers = await this.userRepo.find({ where: { email: In(customerEmails) } });
    const customerMap = new Map(customers.map((u) => [u.email, u]));

    const bookings = await this.bookingRepo.find({ where: { status: BookingStatus.Completed } });
    if (!bookings.length) return;

    const bookingIds = bookings.map((b) => b.id);
    const allBookingServices = await this.bookingServiceRepo.find({ where: { bookingId: In(bookingIds) } });
    const bsMap = new Map(allBookingServices.map((bs) => [bs.bookingId, bs]));

    let seeded = 0;
    for (const def of REVIEW_DEFS) {
      const customer = customerMap.get(def.customerEmail);
      if (!customer) continue;

      const booking = bookings.find((b) => b.customerId === customer.id);
      if (!booking) continue;

      const bs = bsMap.get(booking.id);

      await this.reviewRepo.save(
        this.reviewRepo.create({
          customerId: customer.id,
          bookingId: booking.id,
          serviceId: bs?.serviceId ?? null,
          branchId: booking.branchId,
          technicianId: booking.technicianId,
          rating: def.rating,
          comment: def.comment,
          status: ReviewStatus.Published,
          replyText: null,
          repliedBy: null,
          repliedAt: null,
        }),
      );
      seeded++;
    }

    this.logger.log(`Seeded ${seeded} review(s)`);
  }
}

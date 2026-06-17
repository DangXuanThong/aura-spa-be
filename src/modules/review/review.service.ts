import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BookingService as BookingServiceEntity } from 'src/modules/booking/entities/booking-service.entity';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';
import { ReviewStatus } from './enums/review-status.enum';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewService {
  constructor(
    @InjectRepository(Review)
    private readonly reviewRepo: Repository<Review>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingServiceEntity)
    private readonly bookingServiceRepo: Repository<BookingServiceEntity>,
  ) {}

  // UC17 — Submit Service Review
  async create(dto: CreateReviewDto, customerId: string): Promise<Review> {
    // 1. Find booking and verify ownership
    const booking = await this.bookingRepo.findOne({ where: { id: dto.bookingId } });
    if (!booking) throw new NotFoundException(`Booking ${dto.bookingId} not found`);
    if (booking.customerId !== customerId) throw new ForbiddenException('You do not have access to this booking');

    // 2. Booking must be completed
    if (booking.status !== BookingStatus.Completed) {
      throw new BadRequestException('Reviews can only be submitted for completed appointments');
    }

    // 3. Derive serviceId from the booking-service record
    const bookingSvc = await this.bookingServiceRepo.findOne({ where: { bookingId: dto.bookingId } });
    const serviceId = bookingSvc?.serviceId ?? null;

    // 4. Prevent duplicate review for the same booking + service
    const existing = await this.reviewRepo.findOne({
      where: { customerId, bookingId: dto.bookingId, serviceId: serviceId ?? IsNull() },
    });
    if (existing) throw new ConflictException('You have already submitted a review for this appointment');

    // 5. Create and publish the review
    return this.reviewRepo.save(
      this.reviewRepo.create({
        customerId,
        bookingId: dto.bookingId,
        serviceId,
        branchId: booking.branchId,
        technicianId: booking.technicianId,
        rating: dto.rating,
        comment: dto.comment ?? null,
        status: ReviewStatus.Published,
      }),
    );
  }

  async findMyReviews(customerId: string): Promise<Review[]> {
    return this.reviewRepo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });
  }
}

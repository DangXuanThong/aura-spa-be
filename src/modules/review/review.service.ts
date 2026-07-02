import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BookingService as BookingServiceEntity } from 'src/modules/booking/entities/booking-service.entity';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';
import { ReviewStatus } from './enums/review-status.enum';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReplyReviewDto } from './dto/reply-review.dto';
import { ModerateReviewDto } from './dto/moderate-review.dto';

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

    // 3. Resolve serviceId: use caller-supplied value for multi-service bookings, fall back to first service
    let serviceId: string | null = null;
    if (dto.serviceId) {
      const bookingSvc = await this.bookingServiceRepo.findOne({ where: { bookingId: dto.bookingId, serviceId: dto.serviceId } });
      if (!bookingSvc) throw new BadRequestException(`Service ${dto.serviceId} is not part of booking ${dto.bookingId}`);
      serviceId = dto.serviceId;
    } else {
      const bookingSvc = await this.bookingServiceRepo.findOne({ where: { bookingId: dto.bookingId } });
      serviceId = bookingSvc?.serviceId ?? null;
    }

    // 4. Prevent duplicate review for the same booking + service.
    // When serviceId is null, check by (customerId, bookingId) only — PostgreSQL unique indexes
    // treat NULL != NULL so the DB constraint cannot protect the null case.
    const existing = serviceId
      ? await this.reviewRepo.findOne({ where: { customerId, bookingId: dto.bookingId, serviceId } })
      : await this.reviewRepo.findOne({ where: { customerId, bookingId: dto.bookingId } });
    if (existing) throw new ConflictException('You have already submitted a review for this appointment');

    // 5. Create and publish the review — catch concurrent duplicate inserts (23505)
    try {
      return await this.reviewRepo.save(
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
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).code === '23505') {
        throw new ConflictException('You have already submitted a review for this appointment');
      }
      throw err;
    }
  }

  async findAll(branchId?: string, serviceId?: string, technicianId?: string): Promise<Review[]> {
    return this.reviewRepo.find({
      where: {
        status: ReviewStatus.Published,
        ...(branchId ? { branchId } : {}),
        ...(serviceId ? { serviceId } : {}),
        ...(technicianId ? { technicianId } : {}),
      },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async findMyReviews(customerId: string): Promise<Review[]> {
    return this.reviewRepo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }

  async moderate(id: string, dto: ModerateReviewDto): Promise<Review> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException(`Review ${id} not found`);
    await this.reviewRepo.update(id, { status: dto.status });
    return this.reviewRepo.findOne({ where: { id } }) as Promise<Review>;
  }

  // UC — Manager/Owner reply to a review
  async reply(id: string, dto: ReplyReviewDto, staffId: string): Promise<Review> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) throw new NotFoundException(`Review ${id} not found`);
    if (review.status !== ReviewStatus.Published) {
      throw new BadRequestException('Can only reply to published reviews');
    }

    await this.reviewRepo.update(id, {
      replyText: dto.replyText,
      repliedBy: staffId,
      repliedAt: new Date(),
    });

    return this.reviewRepo.findOne({ where: { id } }) as Promise<Review>;
  }
}

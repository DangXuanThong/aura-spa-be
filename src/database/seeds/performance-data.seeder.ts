import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BookingService as BookingServiceEntity } from 'src/modules/booking/entities/booking-service.entity';
import { Invoice } from 'src/modules/payment/entities/invoice.entity';
import { InvoiceItem } from 'src/modules/payment/entities/invoice-item.entity';
import { Payment } from 'src/modules/payment/entities/payment.entity';
import { Review } from 'src/modules/review/entities/review.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { Service } from 'src/modules/service/entities/service.entity';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';
import { BookingSource } from 'src/modules/booking/enums/booking-source.enum';
import { InvoiceStatus } from 'src/modules/payment/enums/invoice-status.enum';
import { PaymentType } from 'src/modules/payment/enums/payment-type.enum';
import { PaymentMethod } from 'src/modules/payment/enums/payment-method.enum';
import { PaymentStatus } from 'src/modules/payment/enums/payment-status.enum';
import { ReviewStatus } from 'src/modules/review/enums/review-status.enum';
import { RANKING_SEED_BOOKINGS } from './seed-data';

const RANKING_NOTE = 'ranking-seed';

const ALL_EMAILS = [
  'lan.nguyen@gmail.com',
  'minh.tran@gmail.com',
  'hoa.le@gmail.com',
  'bao.pham@gmail.com',
  'mai.hoang@gmail.com',
  'thu.vo@aura-spa.com',
  'duc.nguyen@aura-spa.com',
  'bich.tran@aura-spa.com',
  'long.pham@aura-spa.com',
  'owner@gmail.com',
];

@Injectable()
export class PerformanceDataSeeder {
  private readonly logger = new Logger(PerformanceDataSeeder.name);

  constructor(
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingServiceEntity) private readonly bookingServiceRepo: Repository<BookingServiceEntity>,
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem) private readonly invoiceItemRepo: Repository<InvoiceItem>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Review) private readonly reviewRepo: Repository<Review>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Service) private readonly serviceRepo: Repository<Service>,
  ) {}

  async seed(): Promise<void> {
    const guard = await this.bookingRepo.findOne({ where: { notes: RANKING_NOTE } });
    if (guard) {
      this.logger.log('Ranking seed bookings already exist — skipping');
      return;
    }

    const branches = await this.branchRepo.find();
    const branchMap = new Map(branches.map((b) => [b.code, b]));

    const users = await this.userRepo.find({ where: { email: In(ALL_EMAILS) } });
    const userMap = new Map(users.map((u) => [u.email!, u]));

    const services = await this.serviceRepo.find();
    const serviceMap = new Map(services.map((s) => [s.code, s]));

    const owner = userMap.get('owner@gmail.com');
    if (!owner) return;

    let bookingsSeeded = 0;
    let reviewsSeeded = 0;
    let invoiceIndex = 0;

    for (const def of RANKING_SEED_BOOKINGS) {
      const customer = userMap.get(def.customerEmail);
      const branch = branchMap.get(def.branchCode);
      const technician = userMap.get(def.technicianEmail);
      const service = serviceMap.get(def.serviceCode);
      if (!customer || !branch || !technician || !service) continue;

      const endTime = new Date(def.startTime.getTime() + def.durationMinutes * 60 * 1000);
      invoiceIndex++;

      const booking = await this.bookingRepo.save(
        this.bookingRepo.create({
          customerId: customer.id,
          branchId: branch.id,
          technicianId: technician.id,
          startTime: def.startTime,
          endTime,
          status: BookingStatus.Completed,
          source: BookingSource.Online,
          subtotalAmount: def.price,
          discountAmount: 0,
          depositRequiredAmount: 0,
          paidAmount: def.price,
          remainingAmount: 0,
          notes: RANKING_NOTE,
          createdBy: customer.id,
          checkedInAt: def.startTime,
          completedAt: endTime,
        }),
      );

      const bookingService = await this.bookingServiceRepo.save(
        this.bookingServiceRepo.create({
          bookingId: booking.id,
          serviceId: service.id,
          quantity: 1,
          durationMinutes: def.durationMinutes,
          unitPrice: def.price,
          discountAmount: 0,
          finalAmount: def.price,
        }),
      );

      const dateStr = def.startTime.toISOString().slice(0, 10).replace(/-/g, '');
      const invoiceNumber = `INV-RS-${dateStr}-${String(invoiceIndex).padStart(3, '0')}`;

      const invoice = await this.invoiceRepo.save(
        this.invoiceRepo.create({
          invoiceNumber,
          bookingId: booking.id,
          customerId: customer.id,
          branchId: branch.id,
          status: InvoiceStatus.Paid,
          subtotalAmount: def.price,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount: def.price,
          paidAmount: def.price,
          remainingAmount: 0,
          issuedAt: endTime,
          voidedAt: null,
          createdBy: owner.id,
        }),
      );

      await this.invoiceItemRepo.save(
        this.invoiceItemRepo.create({
          invoiceId: invoice.id,
          serviceId: service.id,
          description: service.name,
          quantity: 1,
          unitPrice: def.price,
          discountAmount: 0,
          lineTotal: def.price,
        }),
      );

      await this.paymentRepo.save(
        this.paymentRepo.create({
          invoiceId: invoice.id,
          bookingId: booking.id,
          customerId: customer.id,
          branchId: branch.id,
          paymentType: PaymentType.FullPayment,
          paymentMethod: PaymentMethod.Cash,
          status: PaymentStatus.Paid,
          amount: def.price,
          paidAt: endTime,
          receivedBy: technician.id,
          refundedAmount: 0,
          refundReason: null,
        }),
      );

      bookingsSeeded++;

      if (def.rating != null) {
        await this.reviewRepo.save(
          this.reviewRepo.create({
            customerId: customer.id,
            bookingId: booking.id,
            serviceId: bookingService.serviceId,
            branchId: branch.id,
            technicianId: technician.id,
            rating: def.rating,
            comment: def.comment ?? null,
            status: ReviewStatus.Published,
            replyText: null,
            repliedBy: null,
            repliedAt: null,
          }),
        );
        reviewsSeeded++;
      }
    }

    this.logger.log(`Seeded ${bookingsSeeded} ranking booking(s) and ${reviewsSeeded} review(s) for UC36/UC37`);
  }
}

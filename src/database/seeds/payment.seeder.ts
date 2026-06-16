import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Invoice } from 'src/modules/payment/entities/invoice.entity';
import { InvoiceItem } from 'src/modules/payment/entities/invoice-item.entity';
import { Payment } from 'src/modules/payment/entities/payment.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BookingService as BookingServiceEntity } from 'src/modules/booking/entities/booking-service.entity';
import { Service } from 'src/modules/service/entities/service.entity';
import { User } from 'src/modules/user/entities/user.entity';
import { InvoiceStatus } from 'src/modules/payment/enums/invoice-status.enum';
import { PaymentType } from 'src/modules/payment/enums/payment-type.enum';
import { PaymentMethod } from 'src/modules/payment/enums/payment-method.enum';
import { PaymentStatus } from 'src/modules/payment/enums/payment-status.enum';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';

@Injectable()
export class PaymentSeeder {
  private readonly logger = new Logger(PaymentSeeder.name);

  constructor(
    @InjectRepository(Invoice) private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem) private readonly invoiceItemRepo: Repository<InvoiceItem>,
    @InjectRepository(Payment) private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Booking) private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingServiceEntity) private readonly bookingServiceRepo: Repository<BookingServiceEntity>,
    @InjectRepository(Service) private readonly serviceRepo: Repository<Service>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async seed(): Promise<void> {
    const count = await this.invoiceRepo.count();
    if (count > 0) {
      this.logger.log('Invoices already exist — skipping');
      return;
    }

    const owner = await this.userRepo.findOne({ where: { email: 'owner@gmail.com' } });
    if (!owner) return;

    const bookings = await this.bookingRepo.find({ where: { status: BookingStatus.Completed } });
    if (!bookings.length) return;

    const bookingIds = bookings.map((b) => b.id);
    const allBookingServices = await this.bookingServiceRepo.find({ where: { bookingId: In(bookingIds) } });
    const bsMap = new Map<string, BookingServiceEntity[]>();
    for (const bs of allBookingServices) {
      const list = bsMap.get(bs.bookingId) ?? [];
      list.push(bs);
      bsMap.set(bs.bookingId, list);
    }

    const serviceIds = [...new Set(allBookingServices.map((bs) => bs.serviceId))];
    const services = await this.serviceRepo.find({ where: { id: In(serviceIds) } });
    const serviceNameMap = new Map(services.map((s) => [s.id, s.name]));

    let seeded = 0;
    for (let i = 0; i < bookings.length; i++) {
      const booking = bookings[i];
      const totalAmount = parseFloat(booking.subtotalAmount as unknown as string);
      const dateStr = booking.startTime.toISOString().slice(0, 10).replace(/-/g, '');
      const invoiceNumber = `INV-${dateStr}-${String(i + 1).padStart(3, '0')}`;

      const invoice = await this.invoiceRepo.save(
        this.invoiceRepo.create({
          invoiceNumber,
          bookingId: booking.id,
          customerId: booking.customerId,
          branchId: booking.branchId,
          status: InvoiceStatus.Paid,
          subtotalAmount: totalAmount,
          discountAmount: 0,
          taxAmount: 0,
          totalAmount,
          paidAmount: totalAmount,
          remainingAmount: 0,
          issuedAt: booking.completedAt,
          voidedAt: null,
          createdBy: owner.id,
        }),
      );

      const bookingServices = bsMap.get(booking.id) ?? [];
      for (const bs of bookingServices) {
        const unitPrice = parseFloat(bs.unitPrice as unknown as string);
        const discountAmount = parseFloat(bs.discountAmount as unknown as string);
        const finalAmount = parseFloat(bs.finalAmount as unknown as string);

        await this.invoiceItemRepo.save(
          this.invoiceItemRepo.create({
            invoiceId: invoice.id,
            serviceId: bs.serviceId,
            description: serviceNameMap.get(bs.serviceId) ?? 'Dịch vụ spa',
            quantity: bs.quantity,
            unitPrice,
            discountAmount,
            lineTotal: finalAmount,
          }),
        );
      }

      await this.paymentRepo.save(
        this.paymentRepo.create({
          invoiceId: invoice.id,
          bookingId: booking.id,
          customerId: booking.customerId,
          branchId: booking.branchId,
          paymentType: PaymentType.FullPayment,
          paymentMethod: PaymentMethod.Cash,
          status: PaymentStatus.Paid,
          amount: totalAmount,
          paidAt: booking.completedAt,
          receivedBy: booking.technicianId,
          refundedAmount: 0,
          refundReason: null,
        }),
      );

      seeded++;
    }

    this.logger.log(`Seeded ${seeded} invoice(s) with items and payment(s)`);
  }
}

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Payment } from './entities/payment.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BookingService as BookingServiceEntity } from 'src/modules/booking/entities/booking-service.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { InvoiceStatus } from './enums/invoice-status.enum';
import { PaymentStatus } from './enums/payment-status.enum';
import { PaymentType } from './enums/payment-type.enum';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { ProcessPaymentDto } from './dto/process-payment.dto';

type InvoiceWithItems = Invoice & { items: InvoiceItem[] };

const INVOICEABLE_STATUSES = [BookingStatus.CheckedIn, BookingStatus.InService, BookingStatus.Completed];

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(InvoiceItem)
    private readonly invoiceItemRepo: Repository<InvoiceItem>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingServiceEntity)
    private readonly bookingServiceRepo: Repository<BookingServiceEntity>,
    @InjectRepository(Branch)
    private readonly branchRepo: Repository<Branch>,
    @InjectRepository(BranchStaff)
    private readonly branchStaffRepo: Repository<BranchStaff>,
    private readonly dataSource: DataSource,
  ) {}

  // UC24 — Generate invoice for a checked-in or in-service booking
  async generateInvoice(dto: GenerateInvoiceDto, staffId: string): Promise<InvoiceWithItems> {
    const booking = await this.bookingRepo.findOne({ where: { id: dto.bookingId } });
    if (!booking) throw new NotFoundException('Booking not found');

    if (!INVOICEABLE_STATUSES.includes(booking.status)) {
      throw new BadRequestException('Invoice can only be generated for checked-in or in-service bookings');
    }

    const assignment = await this.branchStaffRepo.findOne({
      where: { userId: staffId, branchId: booking.branchId, status: StaffStatus.Active },
    });
    if (!assignment) throw new ForbiddenException('You are not an active staff member at this branch');

    const existing = await this.invoiceRepo.findOne({ where: { bookingId: booking.id } });
    if (existing) {
      const items = await this.invoiceItemRepo.find({ where: { invoiceId: existing.id } });
      return Object.assign(existing, { items });
    }

    const bookingServices = await this.bookingServiceRepo.find({
      where: { bookingId: booking.id },
      relations: ['service'],
    });

    const branch = await this.branchRepo.findOneOrFail({ where: { id: booking.branchId } });

    const now = new Date();
    const yyyymmdd = now.toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceNumber = `INV-${branch.code}-${yyyymmdd}-${booking.id}`;

    const subtotal = parseFloat(booking.subtotalAmount as unknown as string);
    const discountAmount = parseFloat(booking.discountAmount as unknown as string);
    const paidAmount = parseFloat(booking.paidAmount as unknown as string);
    const totalAmount = subtotal - discountAmount;
    const remainingAmount = Math.max(0, totalAmount - paidAmount);

    return this.dataSource.transaction(async (manager) => {
      const invoice = await manager.save(
        manager.create(Invoice, {
          invoiceNumber,
          bookingId: booking.id,
          customerId: booking.customerId,
          branchId: booking.branchId,
          status: InvoiceStatus.Issued,
          subtotalAmount: subtotal,
          discountAmount,
          taxAmount: 0,
          totalAmount,
          paidAmount,
          remainingAmount,
          issuedAt: now,
          createdBy: staffId,
        }),
      );

      const items = await Promise.all(
        bookingServices.map((bs) =>
          manager.save(
            manager.create(InvoiceItem, {
              invoiceId: invoice.id,
              serviceId: bs.serviceId,
              description: bs.service?.name ?? 'Service',
              quantity: bs.quantity,
              unitPrice: parseFloat(bs.unitPrice as unknown as string),
              discountAmount: parseFloat(bs.discountAmount as unknown as string),
              lineTotal: parseFloat(bs.finalAmount as unknown as string),
            }),
          ),
        ),
      );

      if (booking.status !== BookingStatus.Completed) {
        await manager.update(Booking, booking.id, { status: BookingStatus.Completed, completedAt: now });
      }

      return Object.assign(invoice, { items });
    });
  }

  // UC24 — Get invoice by ID (with line items)
  async findOne(id: string): Promise<InvoiceWithItems> {
    const invoice = await this.invoiceRepo.findOne({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    const items = await this.invoiceItemRepo.find({ where: { invoiceId: id } });
    return Object.assign(invoice, { items });
  }

  // UC24 — Record counter payment against an invoice
  async processPayment(invoiceId: string, dto: ProcessPaymentDto, staffId: string): Promise<Payment> {
    const invoice = await this.invoiceRepo.findOne({ where: { id: invoiceId } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (![InvoiceStatus.Issued, InvoiceStatus.PartiallyPaid].includes(invoice.status)) {
      throw new BadRequestException('Payment can only be recorded for issued or partially paid invoices');
    }

    const remaining = parseFloat(invoice.remainingAmount as unknown as string);
    if (dto.amount > remaining) {
      throw new BadRequestException(`Amount exceeds remaining balance of ${remaining}`);
    }

    const paymentType = dto.paymentType ?? (dto.amount >= remaining ? PaymentType.FullPayment : PaymentType.Deposit);

    return this.dataSource.transaction(async (manager) => {
      const now = new Date();

      const payment = await manager.save(
        manager.create(Payment, {
          invoiceId: invoice.id,
          bookingId: invoice.bookingId,
          customerId: invoice.customerId,
          branchId: invoice.branchId,
          paymentType,
          paymentMethod: dto.paymentMethod,
          status: PaymentStatus.Paid,
          amount: dto.amount,
          paidAt: now,
          receivedBy: staffId,
          refundedAmount: 0,
          refundReason: null,
        }),
      );

      const newPaid = parseFloat(invoice.paidAmount as unknown as string) + dto.amount;
      const newRemaining = Math.max(0, parseFloat(invoice.totalAmount as unknown as string) - newPaid);
      const newStatus = newRemaining <= 0 ? InvoiceStatus.Paid : InvoiceStatus.PartiallyPaid;

      await manager.update(Invoice, invoice.id, {
        paidAmount: newPaid,
        remainingAmount: newRemaining,
        status: newStatus,
      });

      if (invoice.bookingId) {
        await manager.update(Booking, invoice.bookingId, {
          paidAmount: newPaid,
          remainingAmount: newRemaining,
        });
      }

      return payment;
    });
  }
}

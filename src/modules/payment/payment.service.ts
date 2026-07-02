import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Payment } from './entities/payment.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BookingService } from 'src/modules/booking/entities/booking-service.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { BranchInventory } from 'src/modules/inventory/entities/branch-inventory.entity';
import { InventoryTransaction } from 'src/modules/inventory/entities/inventory-transaction.entity';
import { ServiceInventoryRequirement } from 'src/modules/inventory/entities/service-inventory-requirement.entity';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { InventoryTransactionType } from 'src/modules/inventory/enums/inventory-transaction-type.enum';
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
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(BookingService)
    private readonly bookingServiceRepo: Repository<BookingService>,
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
      const subtotal = parseFloat(booking.subtotalAmount as unknown as string);
      const discountAmount = parseFloat(booking.discountAmount as unknown as string);
      const paidAmount = parseFloat(booking.paidAmount as unknown as string);
      const totalAmount = subtotal - discountAmount;
      const remainingAmount = Math.max(0, totalAmount - paidAmount);
      const syncedStatus = remainingAmount <= 0 ? InvoiceStatus.Paid : paidAmount > 0 ? InvoiceStatus.PartiallyPaid : existing.status;

      if (
        parseFloat(existing.paidAmount as unknown as string) !== paidAmount ||
        parseFloat(existing.remainingAmount as unknown as string) !== remainingAmount ||
        parseFloat(existing.discountAmount as unknown as string) !== discountAmount ||
        parseFloat(existing.totalAmount as unknown as string) !== totalAmount ||
        existing.status !== syncedStatus
      ) {
        await this.invoiceRepo.update(existing.id, {
          discountAmount,
          totalAmount,
          paidAmount,
          remainingAmount,
          status: syncedStatus,
        });
        Object.assign(existing, {
          discountAmount,
          totalAmount,
          paidAmount,
          remainingAmount,
          status: syncedStatus,
        });
      }

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
          subtotalAmount: subtotal,
          discountAmount,
          taxAmount: 0,
          totalAmount,
          paidAmount,
          remainingAmount,
          status: remainingAmount <= 0 ? InvoiceStatus.Paid : paidAmount > 0 ? InvoiceStatus.PartiallyPaid : InvoiceStatus.Issued,
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
        await this.consumeInventoryForCompletedBooking(manager, booking, bookingServices, staffId);
        await manager.update(Booking, booking.id, { status: BookingStatus.Completed, completedAt: now });
      }

      return Object.assign(invoice, { items });
    });
  }

  private async consumeInventoryForCompletedBooking(
    manager: EntityManager,
    booking: Booking,
    bookingServices: BookingService[],
    staffId: string,
  ): Promise<void> {
    const serviceIds = [...new Set(bookingServices.map((item) => item.serviceId))];
    if (serviceIds.length === 0) return;

    const requirements = await manager.find(ServiceInventoryRequirement, {
      where: { serviceId: In(serviceIds), isActive: true },
    });
    if (requirements.length === 0) return;

    const consumedBefore = await manager.find(InventoryTransaction, { where: { bookingId: booking.id } });
    const consumedKeys = new Set(
      consumedBefore
        .filter((tx) => tx.transactionType === InventoryTransactionType.Consume && tx.serviceId)
        .map((tx) => `${tx.serviceId}:${tx.inventoryItemId}`),
    );

    for (const bookingService of bookingServices) {
      const matchingRequirements = requirements.filter((requirement) => requirement.serviceId === bookingService.serviceId);
      for (const requirement of matchingRequirements) {
        const key = `${bookingService.serviceId}:${requirement.inventoryItemId}`;
        if (consumedKeys.has(key)) continue;

        const quantityPerService = parseFloat(requirement.quantityPerService as unknown as string);
        const quantityToConsume = quantityPerService * bookingService.quantity;
        if (!Number.isFinite(quantityToConsume) || quantityToConsume <= 0) continue;

        const stockRow = await manager.findOne(BranchInventory, {
          where: { branchId: booking.branchId, inventoryItemId: requirement.inventoryItemId },
          lock: { mode: 'pessimistic_write' },
        });
        if (!stockRow) {
          throw new BadRequestException(`Inventory item ${requirement.inventoryItemId} is not configured at this branch`);
        }

        const before = parseFloat(stockRow.currentQuantity as unknown as string);
        const after = Math.round((before - quantityToConsume) * 1000) / 1000;
        if (after < 0) {
          throw new BadRequestException(`Insufficient stock for inventory item ${requirement.inventoryItemId}`);
        }

        await manager.update(BranchInventory, stockRow.id, {
          currentQuantity: after,
          lastTransactionAt: new Date(),
        });

        await manager.save(
          manager.create(InventoryTransaction, {
            branchId: booking.branchId,
            inventoryItemId: requirement.inventoryItemId,
            transactionType: InventoryTransactionType.Consume,
            quantityDelta: -quantityToConsume,
            quantityAfter: after,
            bookingId: booking.id,
            serviceId: bookingService.serviceId,
            staffId,
            reason: `Auto-consumed when booking #${booking.id} was completed`,
            createdBy: staffId,
          }),
        );
      }
    }
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

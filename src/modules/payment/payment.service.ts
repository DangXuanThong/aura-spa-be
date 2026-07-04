import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import { PAYMENT_EVENTS, INVENTORY_EVENTS } from 'src/common/constants/events';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Payment } from './entities/payment.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BookingService as BookingServiceEntity } from 'src/modules/booking/entities/booking-service.entity';
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
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { TreatmentCourse } from 'src/modules/treatment/entities/treatment-course.entity';
import { TreatmentSession } from 'src/modules/treatment/entities/treatment-session.entity';
import { TreatmentCourseStatus } from 'src/modules/treatment/enums/treatment-course-status.enum';
import { TreatmentSessionStatus } from 'src/modules/treatment/enums/treatment-session-status.enum';
import { Service } from 'src/modules/service/entities/service.entity';

type InvoiceWithItems = Invoice & { items: InvoiceItem[] };

const INVOICEABLE_STATUSES = [BookingStatus.CheckedIn, BookingStatus.InService, BookingStatus.Completed];
// Vietnam VAT is 10% — kept 0 until pricing model is confirmed with the product team
const INVOICE_TAX_RATE = 0;

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
    @InjectRepository(ServiceInventoryRequirement)
    private readonly serviceInventoryRequirementRepo: Repository<ServiceInventoryRequirement>,
    private readonly dataSource: DataSource,
    private readonly eventEmitter: EventEmitter2,
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
      const syncedStatus =
        remainingAmount <= 0 ? InvoiceStatus.Paid : paidAmount > 0 ? InvoiceStatus.PartiallyPaid : existing.status;

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
      // Lock booking to serialize concurrent generateInvoice calls on the same booking
      const lockedBooking = await manager.findOne(Booking, {
        where: { id: dto.bookingId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedBooking) throw new NotFoundException('Booking not found');

      // Re-check for existing invoice under lock — handles the TOCTOU window
      const existingInTx = await manager.findOne(Invoice, { where: { bookingId: lockedBooking.id } });
      if (existingInTx) {
        const items = await manager.find(InvoiceItem, { where: { invoiceId: existingInTx.id } });
        return Object.assign(existingInTx, { items });
      }

      const invoice = await manager.save(
        manager.create(Invoice, {
          invoiceNumber,
          bookingId: booking.id,
          customerId: booking.customerId,
          branchId: booking.branchId,
          subtotalAmount: subtotal,
          discountAmount,
          taxAmount: Math.round(subtotal * INVOICE_TAX_RATE * 100) / 100,
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
        await this.updateTreatmentProgressOnCheckout(manager, booking, bookingServices, invoice.id, staffId, now);
        await manager.update(Booking, booking.id, { status: BookingStatus.Completed, completedAt: now });
      }

      return Object.assign(invoice, { items });
    });
  }

  private async updateTreatmentProgressOnCheckout(
    manager: EntityManager,
    booking: Booking,
    bookingServices: BookingServiceEntity[],
    invoiceId: string,
    staffId: string,
    now: Date,
  ): Promise<void> {
    for (const bookingService of bookingServices) {
      // Find active TreatmentCourse for this customer and service
      const activeCourse = await manager.findOne(TreatmentCourse, {
        where: {
          customerId: booking.customerId,
          serviceId: bookingService.serviceId,
          status: TreatmentCourseStatus.Active,
        },
        order: { createdAt: 'ASC' },
      });

      if (activeCourse) {
        // Find next planned/booked session
        let session = await manager.findOne(TreatmentSession, {
          where: { treatmentCourseId: activeCourse.id, bookingId: booking.id },
        });
        if (!session) {
          session = await manager.findOne(TreatmentSession, {
            where: {
              treatmentCourseId: activeCourse.id,
              status: In([TreatmentSessionStatus.Planned, TreatmentSessionStatus.Booked]),
            },
            order: { sessionNumber: 'ASC' },
          });
        }

        if (session) {
          session.status = TreatmentSessionStatus.Completed;
          session.bookingId = booking.id;
          session.staffId = booking.technicianId ?? staffId;
          session.completedAt = now;
          await manager.save(TreatmentSession, session);

          const used = parseFloat(activeCourse.usedSessions as any) + 1;
          const remaining = Math.max(0, parseFloat(activeCourse.totalSessions as any) - used);
          activeCourse.usedSessions = used;
          activeCourse.remainingSessions = remaining;
          if (remaining <= 0) {
            activeCourse.status = TreatmentCourseStatus.Completed;
          }
          await manager.save(TreatmentCourse, activeCourse);
        }
      } else {
        // No active course. Let's see if this service is a multi-session service.
        const service = await manager.findOne(Service, {
          where: { id: bookingService.serviceId },
        });
        if (service && service.isMultiSession) {
          const totalSessions = service.totalSessions ?? 5;
          const course = await manager.save(
            manager.create(TreatmentCourse, {
              customerId: booking.customerId,
              serviceId: service.id,
              branchId: booking.branchId,
              purchaseInvoiceId: invoiceId,
              totalSessions,
              usedSessions: 1,
              remainingSessions: totalSessions - 1,
              status: totalSessions > 1 ? TreatmentCourseStatus.Active : TreatmentCourseStatus.Completed,
              startedAt: now,
              expiresAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 year validity
            }),
          );

          for (let i = 1; i <= totalSessions; i++) {
            await manager.save(
              manager.create(TreatmentSession, {
                treatmentCourseId: course.id,
                bookingId: i === 1 ? booking.id : null,
                serviceId: service.id,
                sessionNumber: i,
                status: i === 1 ? TreatmentSessionStatus.Completed : TreatmentSessionStatus.Planned,
                staffId: i === 1 ? (booking.technicianId ?? staffId) : null,
                completedAt: i === 1 ? now : null,
              }),
            );
          }
        }
      }
    }
  }

  private async consumeInventoryForCompletedBooking(
    manager: EntityManager,
    booking: Booking,
    bookingServices: BookingServiceEntity[],
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
          relations: ['inventoryItem'],
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

        const minLevel = stockRow.inventoryItem?.minStockLevel !== null && stockRow.inventoryItem?.minStockLevel !== undefined
          ? parseFloat(stockRow.inventoryItem.minStockLevel as unknown as string)
          : null;
        if (minLevel !== null && after < minLevel) {
          this.eventEmitter.emit(INVENTORY_EVENTS.LOW_STOCK, {
            itemId: requirement.inventoryItemId,
            itemName: stockRow.inventoryItem?.name ?? 'Material',
            branchId: booking.branchId,
            currentQty: after,
          });
        }

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
  async findOne(id: string, requester: { id: string; role: string }): Promise<InvoiceWithItems> {
    const invoice = await this.invoiceRepo.findOne({ where: { id } });
    if (!invoice) throw new NotFoundException('Invoice not found');

    if (requester.role === UserRole.Customer) {
      if (invoice.customerId !== requester.id) {
        throw new ForbiddenException('You do not have access to this invoice');
      }
    } else if (requester.role === UserRole.Staff || requester.role === UserRole.Manager) {
      const assignments = await this.branchStaffRepo.find({
        where: { userId: requester.id, status: StaffStatus.Active },
        select: ['branchId'],
      });
      const branchIds = assignments.map(a => a.branchId);
      if (!branchIds.includes(invoice.branchId)) {
        throw new ForbiddenException('You do not have access to this invoice');
      }
    }
    // Owner has no branch restriction

    const items = await this.invoiceItemRepo.find({ where: { invoiceId: id } });
    return Object.assign(invoice, { items });
  }

  // UC24 — Refund a payment (partial or full)
  async refund(paymentId: string, dto: RefundPaymentDto, staffId: string, staffRole: string): Promise<Payment> {
    const payment = await this.paymentRepo.findOne({ where: { id: paymentId } });
    if (!payment) throw new NotFoundException('Payment not found');

    if (payment.status !== PaymentStatus.Paid && payment.status !== PaymentStatus.PartiallyRefunded) {
      throw new BadRequestException('Only paid or partially refunded payments can be refunded');
    }

    if (staffRole !== UserRole.Owner) {
      const assignment = await this.branchStaffRepo.findOne({
        where: { userId: staffId, branchId: payment.branchId, status: StaffStatus.Active },
      });
      if (!assignment) throw new ForbiddenException('You are not an active staff member at this branch');
    }

    const alreadyRefunded = parseFloat(payment.refundedAmount as unknown as string);
    const originalAmount = parseFloat(payment.amount as unknown as string);
    const maxRefundable = originalAmount - alreadyRefunded;

    if (dto.amount > maxRefundable) {
      throw new BadRequestException(`Refund amount ${dto.amount} exceeds refundable balance of ${maxRefundable}`);
    }

    return this.dataSource.transaction(async (manager) => {
      const locked = await manager.findOne(Payment, {
        where: { id: paymentId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!locked) throw new NotFoundException('Payment not found');

      if (locked.status !== PaymentStatus.Paid && locked.status !== PaymentStatus.PartiallyRefunded) {
        throw new BadRequestException('Only paid or partially refunded payments can be refunded');
      }

      const lockedRefunded = parseFloat(locked.refundedAmount as unknown as string);
      const lockedOriginal = parseFloat(locked.amount as unknown as string);
      if (dto.amount > lockedOriginal - lockedRefunded) {
        throw new BadRequestException(`Refund amount ${dto.amount} exceeds refundable balance of ${lockedOriginal - lockedRefunded}`);
      }

      const newRefunded = lockedRefunded + dto.amount;
      const newStatus = newRefunded >= lockedOriginal ? PaymentStatus.Refunded : PaymentStatus.PartiallyRefunded;

      await manager.update(Payment, paymentId, {
        refundedAmount: newRefunded,
        refundReason: dto.reason,
        status: newStatus,
      });

      if (locked.invoiceId) {
        const invoice = await manager.findOne(Invoice, {
          where: { id: locked.invoiceId },
          lock: { mode: 'pessimistic_write' },
        });
        if (invoice) {
          const invoicePaid = parseFloat(invoice.paidAmount as unknown as string);
          const invoiceTotal = parseFloat(invoice.totalAmount as unknown as string);
          const newPaid = Math.max(0, invoicePaid - dto.amount);
          const newRemaining = Math.max(0, invoiceTotal - newPaid);
          const newInvoiceStatus = newPaid <= 0 ? InvoiceStatus.Refunded : InvoiceStatus.PartiallyPaid;

          await manager.update(Invoice, invoice.id, {
            paidAmount: newPaid,
            remainingAmount: newRemaining,
            status: newInvoiceStatus,
          });

          if (invoice.bookingId) {
            await manager.update(Booking, invoice.bookingId, {
              paidAmount: newPaid,
              remainingAmount: newRemaining,
            });
          }
        }
      }

      return manager.findOne(Payment, { where: { id: paymentId } }) as Promise<Payment>;
    });
  }

  // UC24 — Record counter payment against an invoice
  async processPayment(invoiceId: string, dto: ProcessPaymentDto, staffId: string): Promise<Payment> {
    const payment = await this.dataSource.transaction(async (manager) => {
      const invoice = await manager.findOne(Invoice, {
        where: { id: invoiceId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!invoice) throw new NotFoundException('Invoice not found');

      const staffAssignment = await manager.findOne(BranchStaff, {
        where: { userId: staffId, branchId: invoice.branchId ?? undefined, status: StaffStatus.Active },
      });
      if (!staffAssignment) {
        throw new ForbiddenException('You are not an active staff member at this invoice\'s branch');
      }

      if (![InvoiceStatus.Issued, InvoiceStatus.PartiallyPaid].includes(invoice.status)) {
        throw new BadRequestException('Payment can only be recorded for issued or partially paid invoices');
      }

      if (invoice.bookingId) {
        const booking = await manager.findOne(Booking, { where: { id: invoice.bookingId } });
        if (booking?.status === BookingStatus.Cancelled) {
          throw new BadRequestException('Cannot process payment for a cancelled booking');
        }
      }

      const remaining = parseFloat(invoice.remainingAmount as unknown as string);
      if (dto.amount > remaining) {
        throw new BadRequestException(`Amount exceeds remaining balance of ${remaining}`);
      }

      const paymentType = dto.paymentType ?? (dto.amount >= remaining ? PaymentType.FullPayment : PaymentType.Deposit);

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

    const eventName = payment.paymentType === PaymentType.Deposit
      ? PAYMENT_EVENTS.DEPOSIT_PAID
      : PAYMENT_EVENTS.PROCESSED;
    this.eventEmitter.emit(eventName, {
      paymentId: payment.id,
      invoiceId: payment.invoiceId,
      customerId: payment.customerId,
      branchId: payment.branchId,
      amount: Number(payment.amount),
      paymentType: payment.paymentType,
    });

    return payment;
  }
}

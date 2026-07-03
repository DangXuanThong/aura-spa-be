import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PAYMENT_EVENTS } from 'src/common/constants/events';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';
import { Payment } from '../../entities/payment.entity';
import { PaymentMethod } from '../../enums/payment-method.enum';
import { PaymentStatus } from '../../enums/payment-status.enum';
import { PaymentType } from '../../enums/payment-type.enum';
import { PaymentTransaction } from '../../domain/entities/payment-transaction.entity';
import { PaymentTransactionStatus } from '../../domain/enums/payment-transaction-status.enum';
import { Money } from '../../domain/value-objects/money.vo';
import { ConfirmPaymentFromWebhookCommand } from '../commands/confirm-payment-from-webhook.command';
import { ReferenceCode } from '../../domain/value-objects/reference-code.vo';
import { SePayWebhookPayload } from '../../infrastructure/sepay/sepay-webhook-payload.interface';
import { SepayConfig } from '../../infrastructure/sepay/sepay.config';

@Injectable()
export class ConfirmPaymentFromWebhookHandler {
  private readonly logger = new Logger(ConfirmPaymentFromWebhookHandler.name);

  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentTxRepo: Repository<PaymentTransaction>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Idempotent webhook processing. Always completes without throwing so the controller
   * can return {"success": true} per SePay contract.
   */
  async execute(command: ConfirmPaymentFromWebhookCommand): Promise<void> {
    const { payload, rawPayload } = command;

    if (payload.transferType !== 'in') {
      this.logger.debug(`Ignoring outbound transfer sepay_id=${payload.id}`);
      return;
    }

    const sepayId = String(payload.id);

    // Idempotency: same SePay transaction id must not be processed twice.
    const alreadyProcessed = await this.paymentTxRepo.findOne({
      where: { sepayTransactionId: sepayId },
    });
    if (alreadyProcessed) {
      this.logger.debug(`Duplicate webhook ignored sepay_id=${sepayId}`);
      return;
    }

    const paymentCode = this.resolvePaymentCode(payload);
    if (!paymentCode) {
      this.logger.warn(`Webhook missing payment code sepay_id=${sepayId} content="${payload.content}"`);
      return;
    }

    let referenceCode: ReferenceCode;
    try {
      referenceCode = ReferenceCode.from(paymentCode);
    } catch {
      this.logger.warn(`Invalid payment code in webhook sepay_id=${sepayId} code="${paymentCode}"`);
      return;
    }

    const pendingTx = await this.paymentTxRepo.findOne({
      where: {
        referenceCode: referenceCode.toString(),
        status: PaymentTransactionStatus.Pending,
      },
    });

    if (!pendingTx) {
      this.logger.warn(`No pending transaction for code=${referenceCode.toString()} sepay_id=${sepayId}`);
      return;
    }

    const expectedMoney = Money.vnd(parseFloat(pendingTx.amount as unknown as string));
    if (!expectedMoney.matchesSePayTransfer(payload.transferAmount)) {
      this.logger.warn(
        `Amount mismatch for ${referenceCode.toString()}: expected=${expectedMoney.amount} received=${payload.transferAmount}`,
      );
      return;
    }

    const paidAt = this.parseTransactionDate(payload.transactionDate) ?? new Date();
    if (pendingTx.expiresAt < paidAt) {
      await this.paymentTxRepo.update(pendingTx.id, { status: PaymentTransactionStatus.Expired });
      this.logger.warn(`Payment expired for ${referenceCode.toString()} sepay_id=${sepayId}`);
      return;
    }

    const booking = await this.bookingRepo.findOne({ where: { id: pendingTx.bookingId } });
    if (!booking || booking.status !== BookingStatus.PendingPayment) {
      this.logger.warn(
        `Booking not eligible booking_id=${pendingTx.bookingId} status=${booking?.status ?? 'missing'}`,
      );
      return;
    }

    const depositAmount = expectedMoney.amount;
    const paidAmount = parseFloat(booking.paidAmount as unknown as string) + depositAmount;
    const remainingAmount = Math.max(
      0,
      parseFloat(booking.subtotalAmount as unknown as string) -
        parseFloat(booking.discountAmount as unknown as string) -
        paidAmount,
    );

    try {
      const payment = await this.dataSource.transaction(async (manager) => {
        const lockedTx = await manager.findOne(PaymentTransaction, {
          where: { id: pendingTx.id, status: PaymentTransactionStatus.Pending },
          lock: { mode: 'pessimistic_write' },
        });

        if (!lockedTx) {
          this.logger.debug(`Concurrent webhook skipped for payment_tx=${pendingTx.id}`);
          return null;
        }

        lockedTx.status = PaymentTransactionStatus.Paid;
        lockedTx.sepayTransactionId = sepayId;
        lockedTx.bankReferenceCode = payload.referenceCode ?? null;
        lockedTx.transferContent = payload.content;
        lockedTx.rawWebhookPayload = rawPayload;
        lockedTx.paidAt = paidAt;
        await manager.save(lockedTx);

        await manager.update(Booking, booking.id, {
          status: BookingStatus.Confirmed,
          paidAmount,
          remainingAmount,
        });

        return manager.save(
          manager.create(Payment, {
            bookingId: booking.id,
            customerId: booking.customerId,
            branchId: booking.branchId,
            invoiceId: null,
            paymentType: PaymentType.Deposit,
            paymentMethod: PaymentMethod.BankTransfer,
            status: PaymentStatus.Paid,
            amount: depositAmount,
            paidAt,
            receivedBy: null,
            refundedAmount: 0,
            refundReason: null,
          }),
        );
      });

      if (payment) {
        this.eventEmitter.emit(PAYMENT_EVENTS.DEPOSIT_PAID, {
          paymentId: payment.id,
          invoiceId: payment.invoiceId,
          customerId: payment.customerId,
          branchId: payment.branchId,
          amount: Number(payment.amount),
          paymentType: payment.paymentType,
        });
      }

      this.logger.log(
        `Deposit confirmed booking_id=${booking.id} reference=${referenceCode.toString()} sepay_id=${sepayId}`,
      );
    } catch (error) {
      this.logger.error(`Failed to confirm payment sepay_id=${sepayId}`, error);
    }
  }

  private resolvePaymentCode(payload: SePayWebhookPayload): string | null {
    const config = this.configService.get<SepayConfig>('sepay', { infer: true });
    const prefix = (config?.paymentCodePrefix ?? 'ABK').trim().toUpperCase();
    const escapedPrefix = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const paymentCodePattern = new RegExp(`\\b${escapedPrefix}\\d{8}\\b`, 'i');

    const fields = [payload.code, payload.content, payload.description].filter(
      (value): value is string => typeof value === 'string' && value.trim().length > 0,
    );

    for (const field of fields) {
      const match = field.match(paymentCodePattern);
      if (match) {
        return match[0].toUpperCase();
      }
    }

    return null;
  }

  private parseTransactionDate(value: string | undefined): Date | null {
    if (!value) {
      return null;
    }

    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const hasTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(normalized);
    const parsed = new Date(hasTimezone ? normalized : `${normalized}+07:00`);

    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
}

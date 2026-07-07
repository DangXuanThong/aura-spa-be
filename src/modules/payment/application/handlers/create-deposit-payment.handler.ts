import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';
import { PaymentTransaction } from '../../domain/entities/payment-transaction.entity';
import { PaymentTransactionStatus } from '../../domain/enums/payment-transaction-status.enum';
import { PaymentTransactionType } from '../../domain/enums/payment-transaction-type.enum';
import { PaymentProvider } from '../../domain/enums/payment-provider.enum';
import { ReferenceCode } from '../../domain/value-objects/reference-code.vo';
import { Money } from '../../domain/value-objects/money.vo';
import { CreateDepositPaymentCommand } from '../commands/create-deposit-payment.command';
import { DepositPaymentResponseDto } from '../dto/deposit-payment-response.dto';
import { VietQrUrlBuilder } from '../../infrastructure/sepay/vietqr-url.builder';
import { SepayConfig } from '../../infrastructure/sepay/sepay.config';

@Injectable()
export class CreateDepositPaymentHandler {
  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentTxRepo: Repository<PaymentTransaction>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
    private readonly vietQrUrlBuilder: VietQrUrlBuilder,
    private readonly configService: ConfigService,
  ) {}

  async execute(command: CreateDepositPaymentCommand): Promise<DepositPaymentResponseDto> {
    const booking = await this.bookingRepo.findOne({ where: { id: command.bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.customerId !== command.customerId) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    if (booking.status !== BookingStatus.PendingPayment) {
      throw new BadRequestException('Deposit payment is only available for bookings awaiting payment');
    }

    const config = this.configService.get<SepayConfig>('sepay', { infer: true })!;
    const subtotal = parseFloat(booking.subtotalAmount as unknown as string);
    const discount = parseFloat(booking.discountAmount as unknown as string);
    const effectiveTotal = subtotal - discount;

    let depositAmount = parseFloat(booking.depositRequiredAmount as unknown as string);
    if (depositAmount <= 0 && config.depositPercent > 0) {
      depositAmount = Math.round(effectiveTotal * (config.depositPercent / 100));
    }

    if (depositAmount <= 0) {
      throw new BadRequestException('This booking does not require a deposit payment');
    }

    const money = Money.vnd(depositAmount);
    const referenceCode = ReferenceCode.generate(booking.id, config.paymentCodePrefix);

    const existing = await this.paymentTxRepo.findOne({
      where: {
        bookingId: booking.id,
        transactionType: PaymentTransactionType.Deposit,
      },
    });

    const expiresAt = new Date(Date.now() + config.depositExpireMinutes * 60 * 1000);
    const qrImageUrl = this.vietQrUrlBuilder.buildFromConfig(referenceCode.toString(), money.amount);

    if (existing) {
      if (existing.status === PaymentTransactionStatus.Paid) {
        return this.toResponse(existing, booking.status);
      }

      if (existing.status === PaymentTransactionStatus.Pending && existing.expiresAt > new Date()) {
        return this.toResponse(existing, booking.status);
      }

      // Re-issue QR for expired/failed deposit (unique constraint: one deposit row per booking).
      const renewed = await this.paymentTxRepo.save({
        ...existing,
        status: PaymentTransactionStatus.Pending,
        amount: money.amount,
        referenceCode: referenceCode.toString(),
        qrImageUrl,
        expiresAt,
        paidAt: null,
        sepayTransactionId: null,
        bankReferenceCode: null,
        transferContent: null,
        rawWebhookPayload: null,
      });
      return this.toResponse(renewed, booking.status);
    }

    const saved = await this.paymentTxRepo.save(
      this.paymentTxRepo.create({
        bookingId: booking.id,
        branchId: booking.branchId,
        customerId: booking.customerId,
        provider: PaymentProvider.SePay,
        transactionType: PaymentTransactionType.Deposit,
        status: PaymentTransactionStatus.Pending,
        amount: money.amount,
        currency: money.currency,
        referenceCode: referenceCode.toString(),
        qrImageUrl,
        expiresAt,
        sepayTransactionId: null,
        bankReferenceCode: null,
        transferContent: null,
        rawWebhookPayload: null,
        paidAt: null,
      }),
    );

    return this.toResponse(saved, booking.status);
  }

  private toResponse(tx: PaymentTransaction, bookingStatus: BookingStatus): DepositPaymentResponseDto {
    return {
      paymentTransactionId: tx.id,
      bookingId: tx.bookingId,
      referenceCode: tx.referenceCode,
      amount: parseFloat(tx.amount as unknown as string),
      paymentStatus: tx.status,
      bookingStatus,
      qrImageUrl: tx.qrImageUrl!,
      expiresAt: tx.expiresAt,
      paidAt: tx.paidAt,
    };
  }
}

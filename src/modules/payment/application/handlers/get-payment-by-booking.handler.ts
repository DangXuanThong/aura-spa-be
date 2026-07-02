import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { PaymentTransaction } from '../../domain/entities/payment-transaction.entity';
import { PaymentTransactionType } from '../../domain/enums/payment-transaction-type.enum';
import { GetPaymentByBookingQuery } from '../queries/get-payment-by-booking.query';
import { DepositPaymentResponseDto } from '../dto/deposit-payment-response.dto';

@Injectable()
export class GetPaymentByBookingHandler {
  constructor(
    @InjectRepository(PaymentTransaction)
    private readonly paymentTxRepo: Repository<PaymentTransaction>,
    @InjectRepository(Booking)
    private readonly bookingRepo: Repository<Booking>,
  ) {}

  async execute(query: GetPaymentByBookingQuery): Promise<DepositPaymentResponseDto> {
    const booking = await this.bookingRepo.findOne({ where: { id: query.bookingId } });
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.customerId !== query.customerId) {
      throw new ForbiddenException('You do not have access to this booking');
    }

    const tx = await this.paymentTxRepo.findOne({
      where: {
        bookingId: query.bookingId,
        transactionType: PaymentTransactionType.Deposit,
      },
      order: { createdAt: 'DESC' },
    });

    if (!tx) {
      throw new NotFoundException('No deposit payment found for this booking');
    }

    return {
      paymentTransactionId: tx.id,
      bookingId: tx.bookingId,
      referenceCode: tx.referenceCode,
      amount: parseFloat(tx.amount as unknown as string),
      paymentStatus: tx.status,
      bookingStatus: booking.status,
      qrImageUrl: tx.qrImageUrl ?? '',
      expiresAt: tx.expiresAt,
      paidAt: tx.paidAt,
    };
  }
}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/modules/auth/auth.module';
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
import { PaymentTransaction } from './domain/entities/payment-transaction.entity';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { DepositPaymentController } from './presentation/deposit-payment.controller';
import { SePayWebhookController } from './infrastructure/controllers/sepay-webhook.controller';
import { VietQrUrlBuilder } from './infrastructure/sepay/vietqr-url.builder';
import { SePaySignatureVerifier } from './infrastructure/sepay/sepay-signature.verifier';
import { SePayWebhookGuard } from './infrastructure/guards/sepay-webhook.guard';
import { CreateDepositPaymentHandler } from './application/handlers/create-deposit-payment.handler';
import { ConfirmPaymentFromWebhookHandler } from './application/handlers/confirm-payment-from-webhook.handler';
import { GetPaymentByBookingHandler } from './application/handlers/get-payment-by-booking.handler';
import { LoyaltyModule } from 'src/modules/loyalty/loyalty.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceItem,
      Payment,
      PaymentTransaction,
      Booking,
      BookingServiceEntity,
      Branch,
      BranchStaff,
      BranchInventory,
      InventoryTransaction,
      ServiceInventoryRequirement,
    ]),
    AuthModule,
    LoyaltyModule,
  ],
  controllers: [PaymentController, DepositPaymentController, SePayWebhookController],
  providers: [
    PaymentService,
    VietQrUrlBuilder,
    SePaySignatureVerifier,
    SePayWebhookGuard,
    CreateDepositPaymentHandler,
    ConfirmPaymentFromWebhookHandler,
    GetPaymentByBookingHandler,
  ],
  exports: [PaymentService, CreateDepositPaymentHandler, GetPaymentByBookingHandler],
})
export class PaymentModule {}

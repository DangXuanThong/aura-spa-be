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
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      Invoice,
      InvoiceItem,
      Payment,
      Booking,
      BookingServiceEntity,
      Branch,
      BranchStaff,
      BranchInventory,
      InventoryTransaction,
      ServiceInventoryRequirement,
    ]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}

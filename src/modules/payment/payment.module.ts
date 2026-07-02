import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Invoice } from './entities/invoice.entity';
import { InvoiceItem } from './entities/invoice-item.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BookingService } from 'src/modules/booking/entities/booking-service.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { BranchInventory } from 'src/modules/inventory/entities/branch-inventory.entity';
import { InventoryTransaction } from 'src/modules/inventory/entities/inventory-transaction.entity';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';

@Module({
  imports: [TypeOrmModule.forFeature([Invoice, InvoiceItem, Booking, BookingService, Branch, BranchStaff, BranchInventory, InventoryTransaction])],
  controllers: [PaymentController],
  providers: [PaymentService],
})
export class PaymentModule {}

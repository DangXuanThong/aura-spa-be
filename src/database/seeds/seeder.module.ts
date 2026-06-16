import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/modules/user/entities/user.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { Service } from 'src/modules/service/entities/service.entity';
import { BranchOpeningHours } from 'src/modules/branch/entities/branch-opening-hours.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { BranchService as BranchServiceEntity } from 'src/modules/branch-service/entities/branch-service.entity';
import { BookingSlotConfig } from 'src/modules/booking/entities/booking-slot-config.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { BookingService as BookingServiceEntity } from 'src/modules/booking/entities/booking-service.entity';
import { Invoice } from 'src/modules/payment/entities/invoice.entity';
import { InvoiceItem } from 'src/modules/payment/entities/invoice-item.entity';
import { Payment } from 'src/modules/payment/entities/payment.entity';
import { Review } from 'src/modules/review/entities/review.entity';
import { HealthRecord } from 'src/modules/health/entities/health-record.entity';
import { InventoryItem } from 'src/modules/inventory/entities/inventory-item.entity';
import { BranchInventory } from 'src/modules/inventory/entities/branch-inventory.entity';
import { SeederService } from './seeder.service';
import { BranchSetupSeeder } from './branch-setup.seeder';
import { BookingSeeder } from './booking.seeder';
import { PaymentSeeder } from './payment.seeder';
import { ReviewSeeder } from './review.seeder';
import { HealthSeeder } from './health.seeder';
import { InventorySeeder } from './inventory.seeder';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Branch,
      Service,
      BranchOpeningHours,
      BranchStaff,
      BranchServiceEntity,
      BookingSlotConfig,
      Booking,
      BookingServiceEntity,
      Invoice,
      InvoiceItem,
      Payment,
      Review,
      HealthRecord,
      InventoryItem,
      BranchInventory,
    ]),
  ],
  providers: [SeederService, BranchSetupSeeder, BookingSeeder, PaymentSeeder, ReviewSeeder, HealthSeeder, InventorySeeder],
})
export class SeederModule {}

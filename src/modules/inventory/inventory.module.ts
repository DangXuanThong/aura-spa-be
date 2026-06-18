import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BranchInventory } from './entities/branch-inventory.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { InventoryController } from './inventory.controller';
import { InventoryService } from './inventory.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([BranchInventory, InventoryTransaction, BranchStaff]), AuthModule],
  controllers: [InventoryController],
  providers: [InventoryService, RolesGuard],
})
export class InventoryModule {}

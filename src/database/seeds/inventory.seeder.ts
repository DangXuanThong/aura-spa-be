import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from 'src/modules/inventory/entities/inventory-item.entity';
import { BranchInventory } from 'src/modules/inventory/entities/branch-inventory.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { INVENTORY_ITEMS } from './seed-data';

@Injectable()
export class InventorySeeder {
  private readonly logger = new Logger(InventorySeeder.name);

  constructor(
    @InjectRepository(InventoryItem) private readonly itemRepo: Repository<InventoryItem>,
    @InjectRepository(BranchInventory) private readonly branchInventoryRepo: Repository<BranchInventory>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
  ) {}

  async seed(): Promise<void> {
    const itemCount = await this.itemRepo.count();
    if (itemCount > 0) {
      this.logger.log('Inventory items already exist — skipping');
      return;
    }

    const branches = await this.branchRepo.find();
    const branchMap = new Map(branches.map((b) => [b.code, b]));

    let itemsSeeded = 0;
    let stockSeeded = 0;

    for (const def of INVENTORY_ITEMS) {
      const item = await this.itemRepo.save(
        this.itemRepo.create({
          sku: def.sku,
          name: def.name,
          unit: def.unit,
          category: def.category,
          minStockLevel: def.minStockLevel,
          status: def.status,
        }),
      );
      itemsSeeded++;

      for (const [branchCode, qty] of Object.entries(def.stockByBranch)) {
        const branch = branchMap.get(branchCode);
        if (!branch) continue;

        await this.branchInventoryRepo.save(
          this.branchInventoryRepo.create({
            branchId: branch.id,
            inventoryItemId: item.id,
            currentQuantity: qty,
            reservedQuantity: 0,
            lastTransactionAt: new Date(),
          }),
        );
        stockSeeded++;
      }
    }

    this.logger.log(`Seeded ${itemsSeeded} inventory item(s) and ${stockSeeded} branch-inventory record(s)`);
  }
}

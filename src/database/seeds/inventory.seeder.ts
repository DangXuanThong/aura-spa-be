import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InventoryItem } from 'src/modules/inventory/entities/inventory-item.entity';
import { BranchInventory } from 'src/modules/inventory/entities/branch-inventory.entity';
import { ServiceInventoryRequirement } from 'src/modules/inventory/entities/service-inventory-requirement.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { Service } from 'src/modules/service/entities/service.entity';
import { INVENTORY_ITEMS, SERVICE_INVENTORY_REQUIREMENTS } from './seed-data';

@Injectable()
export class InventorySeeder {
  private readonly logger = new Logger(InventorySeeder.name);

  constructor(
    @InjectRepository(InventoryItem) private readonly itemRepo: Repository<InventoryItem>,
    @InjectRepository(BranchInventory) private readonly branchInventoryRepo: Repository<BranchInventory>,
    @InjectRepository(ServiceInventoryRequirement) private readonly requirementRepo: Repository<ServiceInventoryRequirement>,
    @InjectRepository(Branch) private readonly branchRepo: Repository<Branch>,
    @InjectRepository(Service) private readonly serviceRepo: Repository<Service>,
  ) {}

  async seed(): Promise<void> {
    const branches = await this.branchRepo.find();
    const branchMap = new Map(branches.map((branch) => [branch.code, branch]));

    let itemsSeeded = 0;
    let stockSeeded = 0;

    for (const def of INVENTORY_ITEMS) {
      let item = await this.itemRepo.findOne({ where: { sku: def.sku } });

      if (!item) {
        item = await this.itemRepo.save(
          this.itemRepo.create({
            sku: def.sku,
            name: def.name,
            unit: def.unit,
            category: def.category,
            minStockLevel: def.minStockLevel,
            unitCost: def.unitCost,
            status: def.status,
          }),
        );
        itemsSeeded++;
      } else {
        await this.itemRepo.update(item.id, {
          name: def.name,
          unit: def.unit,
          category: def.category,
          minStockLevel: def.minStockLevel,
          unitCost: def.unitCost,
          status: def.status,
        });
      }

      for (const [branchCode, qty] of Object.entries(def.stockByBranch)) {
        const branch = branchMap.get(branchCode);
        if (!branch) continue;

        const existingStock = await this.branchInventoryRepo.findOne({
          where: { branchId: branch.id, inventoryItemId: item.id },
        });
        if (existingStock) continue;

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

    const services = await this.serviceRepo.find();
    const items = await this.itemRepo.find();
    const serviceMap = new Map(services.map((service) => [service.code, service]));
    const itemMap = new Map(items.map((item) => [item.sku, item]));
    let requirementsSeeded = 0;

    for (const def of SERVICE_INVENTORY_REQUIREMENTS) {
      const service = serviceMap.get(def.serviceCode);
      const item = itemMap.get(def.itemSku);
      if (!service || !item) continue;

      const existing = await this.requirementRepo.findOne({
        where: { serviceId: service.id, inventoryItemId: item.id },
      });

      if (existing) {
        await this.requirementRepo.update(existing.id, {
          quantityPerService: def.quantityPerService,
          isActive: true,
        });
        continue;
      }

      await this.requirementRepo.save(
        this.requirementRepo.create({
          serviceId: service.id,
          inventoryItemId: item.id,
          quantityPerService: def.quantityPerService,
          isActive: true,
        }),
      );
      requirementsSeeded++;
    }

    this.logger.log(
      `Seeded ${itemsSeeded} inventory item(s), ${stockSeeded} branch-inventory record(s), ${requirementsSeeded} service requirement(s)`,
    );
  }
}

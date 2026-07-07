import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BranchInventory } from './entities/branch-inventory.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { InventoryTransactionType } from './enums/inventory-transaction-type.enum';
import { ImportStockDto } from './dto/import-stock.dto';
import { ConsumeStockDto } from './dto/consume-stock.dto';
import { StockCheckDto } from './dto/stock-check.dto';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { INVENTORY_EVENTS } from 'src/common/constants/events';
import { ServiceInventoryRequirement } from './entities/service-inventory-requirement.entity';
import { InventoryItem } from './entities/inventory-item.entity';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(BranchInventory)
    private readonly branchInventoryRepo: Repository<BranchInventory>,
    @InjectRepository(InventoryTransaction)
    private readonly transactionRepo: Repository<InventoryTransaction>,
    @InjectRepository(BranchStaff)
    private readonly branchStaffRepo: Repository<BranchStaff>,
    @InjectRepository(ServiceInventoryRequirement)
    private readonly serviceInventoryRequirementRepo: Repository<ServiceInventoryRequirement>,
    @InjectRepository(InventoryItem)
    private readonly inventoryItemRepo: Repository<InventoryItem>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async listAllItems(): Promise<InventoryItem[]> {
    return this.inventoryItemRepo.find({
      where: { status: 'active' as any },
      order: { name: 'ASC' },
    });
  }

  // UC30 — List current stock levels for a branch
  async listByBranch(branchId: string, managerId: string): Promise<BranchInventory[]> {
    await this.assertManagerAtBranch(managerId, branchId);

    return this.branchInventoryRepo.find({
      where: { branchId },
      relations: ['inventoryItem'],
      order: { inventoryItemId: 'ASC' },
    });
  }

  // Get active inventory requirements for services (recipes)
  async getRequirements(): Promise<ServiceInventoryRequirement[]> {
    return this.serviceInventoryRequirementRepo.find({
      where: { isActive: true },
      relations: ['service', 'inventoryItem'],
      order: { serviceId: 'ASC' },
    });
  }

  // UC30 — Import new stock
  async importStock(branchId: string, dto: ImportStockDto, managerId: string): Promise<InventoryTransaction> {
    await this.assertManagerAtBranch(managerId, branchId);

    const row = await this.branchInventoryRepo.findOne({ where: { branchId, inventoryItemId: dto.inventoryItemId } });
    if (!row) throw new NotFoundException(`Inventory item ${dto.inventoryItemId} not found at branch ${branchId}`);

    const before = parseFloat(row.currentQuantity as unknown as string);
    const after = before + dto.quantity;

    await this.branchInventoryRepo.update(row.id, { currentQuantity: after, lastTransactionAt: new Date() });

    return this.transactionRepo.save(
      this.transactionRepo.create({
        branchId,
        inventoryItemId: dto.inventoryItemId,
        transactionType: InventoryTransactionType.Import,
        quantityDelta: dto.quantity,
        quantityAfter: after,
        reason: dto.reason ?? null,
        createdBy: managerId,
      }),
    );
  }

  // UC30 — Record consumable usage
  async consumeStock(branchId: string, dto: ConsumeStockDto, managerId: string): Promise<InventoryTransaction> {
    await this.assertManagerAtBranch(managerId, branchId);

    const row = await this.branchInventoryRepo.findOne({
      where: { branchId, inventoryItemId: dto.inventoryItemId },
      relations: ['inventoryItem'],
    });
    if (!row) throw new NotFoundException(`Inventory item ${dto.inventoryItemId} not found at branch ${branchId}`);

    const before = parseFloat(row.currentQuantity as unknown as string);
    const after = before - dto.quantity;

    if (after < 0) throw new BadRequestException('Insufficient stock — consumption would result in negative quantity');

    await this.branchInventoryRepo.update(row.id, { currentQuantity: after, lastTransactionAt: new Date() });

    const minLevel = row.inventoryItem?.minStockLevel !== null && row.inventoryItem?.minStockLevel !== undefined
      ? parseFloat(row.inventoryItem.minStockLevel as unknown as string)
      : null;
    if (minLevel !== null && after < minLevel) {
      this.eventEmitter.emit(INVENTORY_EVENTS.LOW_STOCK, {
        itemId: dto.inventoryItemId,
        itemName: row.inventoryItem?.name ?? 'Material',
        branchId,
        currentQty: after,
      });
    }

    return this.transactionRepo.save(
      this.transactionRepo.create({
        branchId,
        inventoryItemId: dto.inventoryItemId,
        transactionType: InventoryTransactionType.Consume,
        quantityDelta: -dto.quantity,
        quantityAfter: after,
        bookingId: dto.bookingId ?? null,
        serviceId: dto.serviceId ?? null,
        reason: dto.reason ?? null,
        createdBy: managerId,
      }),
    );
  }

  // UC30 — Periodic stock check / correction
  async stockCheck(branchId: string, dto: StockCheckDto, managerId: string): Promise<InventoryTransaction> {
    await this.assertManagerAtBranch(managerId, branchId);

    const row = await this.branchInventoryRepo.findOne({
      where: { branchId, inventoryItemId: dto.inventoryItemId },
      relations: ['inventoryItem'],
    });
    if (!row) throw new NotFoundException(`Inventory item ${dto.inventoryItemId} not found at branch ${branchId}`);

    const before = parseFloat(row.currentQuantity as unknown as string);
    const delta = dto.actualQuantity - before;

    await this.branchInventoryRepo.update(row.id, { currentQuantity: dto.actualQuantity, lastTransactionAt: new Date() });

    const minLevel = row.inventoryItem?.minStockLevel !== null && row.inventoryItem?.minStockLevel !== undefined
      ? parseFloat(row.inventoryItem.minStockLevel as unknown as string)
      : null;
    if (minLevel !== null && dto.actualQuantity < minLevel) {
      this.eventEmitter.emit(INVENTORY_EVENTS.LOW_STOCK, {
        itemId: dto.inventoryItemId,
        itemName: row.inventoryItem?.name ?? 'Material',
        branchId,
        currentQty: dto.actualQuantity,
      });
    }

    return this.transactionRepo.save(
      this.transactionRepo.create({
        branchId,
        inventoryItemId: dto.inventoryItemId,
        transactionType: InventoryTransactionType.StockCheckCorrection,
        quantityDelta: delta,
        quantityAfter: dto.actualQuantity,
        reason: dto.reason ?? null,
        createdBy: managerId,
      }),
    );
  }

  private async assertManagerAtBranch(managerId: string, branchId: string): Promise<void> {
    const assignment = await this.branchStaffRepo.findOne({
      where: { userId: managerId, branchId, status: StaffStatus.Active },
    });
    if (!assignment) throw new ForbiddenException('You are not an active manager at this branch');
  }

  async createRequirement(dto: { serviceId: string; inventoryItemId: string; quantityPerService: number }): Promise<ServiceInventoryRequirement> {
    const existing = await this.serviceInventoryRequirementRepo.findOne({
      where: { serviceId: dto.serviceId, inventoryItemId: dto.inventoryItemId },
    });
    if (existing) {
      existing.quantityPerService = dto.quantityPerService;
      existing.isActive = true;
      return this.serviceInventoryRequirementRepo.save(existing);
    }
    return this.serviceInventoryRequirementRepo.save(
      this.serviceInventoryRequirementRepo.create({
        serviceId: dto.serviceId,
        inventoryItemId: dto.inventoryItemId,
        quantityPerService: dto.quantityPerService,
        isActive: true,
      }),
    );
  }

  async updateRequirement(id: string, dto: { quantityPerService: number; isActive?: boolean }): Promise<ServiceInventoryRequirement> {
    const req = await this.serviceInventoryRequirementRepo.findOne({ where: { id } });
    if (!req) throw new NotFoundException(`Requirement ${id} not found`);
    if (dto.quantityPerService !== undefined) req.quantityPerService = dto.quantityPerService;
    if (dto.isActive !== undefined) req.isActive = dto.isActive;
    return this.serviceInventoryRequirementRepo.save(req);
  }

  async deleteRequirement(id: string): Promise<void> {
    const req = await this.serviceInventoryRequirementRepo.findOne({ where: { id } });
    if (!req) throw new NotFoundException(`Requirement ${id} not found`);
    await this.serviceInventoryRequirementRepo.delete(id);
  }
}

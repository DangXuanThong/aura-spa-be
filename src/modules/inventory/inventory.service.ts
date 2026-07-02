import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BranchInventory } from './entities/branch-inventory.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { BranchStaff } from 'src/modules/branch/entities/branch-staff.entity';
import { StaffStatus } from 'src/modules/branch/enums/staff-status.enum';
import { InventoryTransactionType } from './enums/inventory-transaction-type.enum';
import { ImportStockDto } from './dto/import-stock.dto';
import { ConsumeStockDto } from './dto/consume-stock.dto';
import { StockCheckDto } from './dto/stock-check.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(BranchInventory)
    private readonly branchInventoryRepo: Repository<BranchInventory>,
    @InjectRepository(BranchStaff)
    private readonly branchStaffRepo: Repository<BranchStaff>,
    private readonly dataSource: DataSource,
  ) {}

  // UC30 — List current stock levels for a branch
  async listByBranch(branchId: string, managerId: string): Promise<BranchInventory[]> {
    await this.assertManagerAtBranch(managerId, branchId);

    return this.branchInventoryRepo.find({
      where: { branchId },
      relations: ['inventoryItem'],
      order: { inventoryItemId: 'ASC' },
    });
  }

  // UC30 — Import new stock
  async importStock(branchId: string, dto: ImportStockDto, managerId: string): Promise<InventoryTransaction> {
    await this.assertManagerAtBranch(managerId, branchId);

    // Stock-quantity update + the transaction-log row must commit together, and the
    // read-modify-write on currentQuantity needs a row lock — two concurrent imports
    // reading the same "before" value would otherwise silently drop one of them.
    return this.dataSource.transaction(async (manager) => {
      const row = await manager.findOne(BranchInventory, {
        where: { branchId, inventoryItemId: dto.inventoryItemId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!row) throw new NotFoundException(`Inventory item ${dto.inventoryItemId} not found at branch ${branchId}`);

      const before = parseFloat(row.currentQuantity as unknown as string);
      const after = before + dto.quantity;

      await manager.update(BranchInventory, row.id, { currentQuantity: after, lastTransactionAt: new Date() });

      return manager.save(
        manager.create(InventoryTransaction, {
          branchId,
          inventoryItemId: dto.inventoryItemId,
          transactionType: InventoryTransactionType.Import,
          quantityDelta: dto.quantity,
          quantityAfter: after,
          reason: dto.reason ?? null,
          createdBy: managerId,
        }),
      );
    });
  }

  // UC30 — Record consumable usage
  async consumeStock(branchId: string, dto: ConsumeStockDto, managerId: string): Promise<InventoryTransaction> {
    await this.assertManagerAtBranch(managerId, branchId);

    return this.dataSource.transaction(async (manager) => {
      const row = await manager.findOne(BranchInventory, {
        where: { branchId, inventoryItemId: dto.inventoryItemId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!row) throw new NotFoundException(`Inventory item ${dto.inventoryItemId} not found at branch ${branchId}`);

      const before = parseFloat(row.currentQuantity as unknown as string);
      const after = before - dto.quantity;

      if (after < 0) throw new BadRequestException('Insufficient stock — consumption would result in negative quantity');

      await manager.update(BranchInventory, row.id, { currentQuantity: after, lastTransactionAt: new Date() });

      return manager.save(
        manager.create(InventoryTransaction, {
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
    });
  }

  // UC30 — Periodic stock check / correction
  async stockCheck(branchId: string, dto: StockCheckDto, managerId: string): Promise<InventoryTransaction> {
    await this.assertManagerAtBranch(managerId, branchId);

    return this.dataSource.transaction(async (manager) => {
      const row = await manager.findOne(BranchInventory, {
        where: { branchId, inventoryItemId: dto.inventoryItemId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!row) throw new NotFoundException(`Inventory item ${dto.inventoryItemId} not found at branch ${branchId}`);

      const before = parseFloat(row.currentQuantity as unknown as string);
      const delta = dto.actualQuantity - before;

      await manager.update(BranchInventory, row.id, { currentQuantity: dto.actualQuantity, lastTransactionAt: new Date() });

      return manager.save(
        manager.create(InventoryTransaction, {
          branchId,
          inventoryItemId: dto.inventoryItemId,
          transactionType: InventoryTransactionType.StockCheckCorrection,
          quantityDelta: delta,
          quantityAfter: dto.actualQuantity,
          reason: dto.reason ?? null,
          createdBy: managerId,
        }),
      );
    });
  }

  private async assertManagerAtBranch(managerId: string, branchId: string): Promise<void> {
    const assignment = await this.branchStaffRepo.findOne({
      where: { userId: managerId, branchId, status: StaffStatus.Active },
    });
    if (!assignment) throw new ForbiddenException('You are not an active manager at this branch');
  }
}

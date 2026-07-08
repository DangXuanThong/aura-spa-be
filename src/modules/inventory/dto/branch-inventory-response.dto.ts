import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { InventoryItemStatus } from '../enums/inventory-item-status.enum';
import { InventoryTransactionType } from '../enums/inventory-transaction-type.enum';

export class InventoryItemSummaryDto {
  @ApiProperty({ example: '3' })
  id!: string;

  @ApiProperty({ example: 'OIL-001' })
  sku!: string;

  @ApiProperty({ example: 'Lavender Essential Oil' })
  name!: string;

  @ApiProperty({ example: 'ml' })
  unit!: string;

  @ApiPropertyOptional({ example: 'Oils' })
  category!: string | null;

  @ApiPropertyOptional({ example: 100 })
  minStockLevel!: number | null;

  @ApiProperty({ example: 180000 })
  unitCost!: number;

  @ApiProperty({ enum: InventoryItemStatus, example: InventoryItemStatus.Active })
  status!: InventoryItemStatus;
}

export class BranchInventoryResponseDto {
  @ApiProperty({ example: '10' })
  id!: string;

  @ApiProperty({ example: '1' })
  branchId!: string;

  @ApiProperty({ example: '3' })
  inventoryItemId!: string;

  @ApiProperty({ example: 250.5 })
  currentQuantity!: number;

  @ApiProperty({ example: 0 })
  reservedQuantity!: number;

  @ApiProperty({ example: true })
  isLowStock!: boolean;

  @ApiPropertyOptional({ example: '2026-06-18T08:00:00.000Z' })
  lastTransactionAt!: Date | null;

  @ApiProperty({ type: InventoryItemSummaryDto })
  @Type(() => InventoryItemSummaryDto)
  inventoryItem!: InventoryItemSummaryDto;

  @ApiProperty({ example: '2026-06-18T08:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-18T08:00:00.000Z' })
  updatedAt!: Date;
}

export class InventoryTransactionResponseDto {
  @ApiProperty({ example: '55' })
  id!: string;

  @ApiProperty({ example: '1' })
  branchId!: string;

  @ApiProperty({ example: '3' })
  inventoryItemId!: string;

  @ApiProperty({ enum: InventoryTransactionType, example: InventoryTransactionType.Import })
  transactionType!: InventoryTransactionType;

  @ApiProperty({ example: 50 })
  quantityDelta!: number;

  @ApiPropertyOptional({ example: 300 })
  quantityAfter!: number | null;

  @ApiPropertyOptional({ example: '12' })
  bookingId!: string | null;

  @ApiPropertyOptional({ example: '5' })
  serviceId!: string | null;

  @ApiPropertyOptional({ example: 'Monthly restock from supplier' })
  reason!: string | null;

  @ApiProperty({ example: '7' })
  createdBy!: string;

  @ApiProperty({ example: '2026-06-18T08:00:00.000Z' })
  createdAt!: Date;
}

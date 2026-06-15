import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { InventoryItemStatus } from '../enums/inventory-item-status.enum';

@Entity('inventory_items')
@Index('IDX_inventory_items_sku_unique', ['sku'], { unique: true })
@Index('IDX_inventory_items_status', ['status'])
@Index('IDX_inventory_items_category', ['category'])
export class InventoryItem {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  sku!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 50, nullable: false })
  unit!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category!: string | null;

  @Column({ name: 'min_stock_level', type: 'decimal', precision: 10, scale: 3, nullable: true })
  minStockLevel!: number | null;

  @Column({
    type: 'enum',
    enum: InventoryItemStatus,
    enumName: 'inventory_item_status',
    default: InventoryItemStatus.Active,
    nullable: false,
  })
  status!: InventoryItemStatus;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { InventoryItem } from './inventory-item.entity';

@Entity('branch_inventory')
@Index('IDX_branch_inventory_branch_item', ['branchId', 'inventoryItemId'], { unique: true })
@Index('IDX_branch_inventory_branch_id', ['branchId'])
@Index('IDX_branch_inventory_item_id', ['inventoryItemId'])
@Index('IDX_branch_inventory_branch_qty', ['branchId', 'currentQuantity'])
export class BranchInventory {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'branch_id', type: 'bigint', nullable: false })
  branchId!: string;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'branch_id' })
  branch?: Branch;

  @Column({ name: 'inventory_item_id', type: 'bigint', nullable: false })
  inventoryItemId!: string;

  @ManyToOne(() => InventoryItem, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'inventory_item_id' })
  inventoryItem?: InventoryItem;

  @Column({ name: 'current_quantity', type: 'decimal', precision: 10, scale: 3, default: 0, nullable: false })
  currentQuantity!: number;

  @Column({ name: 'reserved_quantity', type: 'decimal', precision: 10, scale: 3, default: 0, nullable: false })
  reservedQuantity!: number;

  @Column({ name: 'last_transaction_at', type: 'timestamptz', nullable: true })
  lastTransactionAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

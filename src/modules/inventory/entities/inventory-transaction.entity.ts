import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from 'src/modules/user/entities/user.entity';
import { Branch } from 'src/modules/branch/entities/branch.entity';
import { Service } from 'src/modules/service/entities/service.entity';
import { Booking } from 'src/modules/booking/entities/booking.entity';
import { InventoryItem } from './inventory-item.entity';
import { InventoryTransactionType } from '../enums/inventory-transaction-type.enum';

@Entity('inventory_transactions')
@Index('IDX_inv_tx_branch_id', ['branchId'])
@Index('IDX_inv_tx_item_id', ['inventoryItemId'])
@Index('IDX_inv_tx_type', ['transactionType'])
@Index('IDX_inv_tx_booking_id', ['bookingId'])
@Index('IDX_inv_tx_service_id', ['serviceId'])
@Index('IDX_inv_tx_created_by', ['createdBy'])
@Index('IDX_inv_tx_branch_item_created', ['branchId', 'inventoryItemId', 'createdAt'])
export class InventoryTransaction {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'branch_id', type: 'bigint', nullable: false })
  branchId!: string;

  @ManyToOne(() => Branch, { onDelete: 'RESTRICT' })
  branch?: Branch;

  @Column({ name: 'inventory_item_id', type: 'bigint', nullable: false })
  inventoryItemId!: string;

  @ManyToOne(() => InventoryItem, { onDelete: 'RESTRICT' })
  inventoryItem?: InventoryItem;

  @Column({
    name: 'transaction_type',
    type: 'enum',
    enum: InventoryTransactionType,
    enumName: 'inventory_transaction_type',
    nullable: false,
  })
  transactionType!: InventoryTransactionType;

  @Column({ name: 'quantity_delta', type: 'decimal', precision: 10, scale: 3, nullable: false })
  quantityDelta!: number; // positive = increase, negative = decrease

  @Column({ name: 'quantity_after', type: 'decimal', precision: 10, scale: 3, nullable: true })
  quantityAfter!: number | null;

  @Column({ name: 'booking_id', type: 'bigint', nullable: true })
  bookingId!: string | null;

  @ManyToOne(() => Booking, { onDelete: 'SET NULL', nullable: true })
  booking?: Booking;

  @Column({ name: 'service_id', type: 'bigint', nullable: true })
  serviceId!: string | null;

  @ManyToOne(() => Service, { onDelete: 'SET NULL', nullable: true })
  service?: Service;

  @Column({ name: 'staff_id', type: 'bigint', nullable: true })
  staffId!: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  staff?: User;

  @Column({ type: 'text', nullable: true })
  reason!: string | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: false })
  createdBy!: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  createdByUser?: User;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Service } from 'src/modules/service/entities/service.entity';
import { InventoryItem } from './inventory-item.entity';

@Entity('service_inventory_requirements')
@Index('IDX_service_inventory_requirements_service_item', ['serviceId', 'inventoryItemId'], { unique: true })
@Index('IDX_service_inventory_requirements_service_id', ['serviceId'])
@Index('IDX_service_inventory_requirements_item_id', ['inventoryItemId'])
export class ServiceInventoryRequirement {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'service_id', type: 'bigint', nullable: false })
  serviceId!: string;

  @ManyToOne(() => Service, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'service_id' })
  service?: Service;

  @Column({ name: 'inventory_item_id', type: 'bigint', nullable: false })
  inventoryItemId!: string;

  @ManyToOne(() => InventoryItem, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'inventory_item_id' })
  inventoryItem?: InventoryItem;

  @Column({ name: 'quantity_per_service', type: 'decimal', precision: 10, scale: 3, nullable: false })
  quantityPerService!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true, nullable: false })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

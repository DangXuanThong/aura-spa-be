import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Invoice } from './invoice.entity';
import { Service } from 'src/modules/service/entities/service.entity';

@Entity('invoice_items')
@Index('IDX_invoice_items_invoice_id', ['invoiceId'])
@Index('IDX_invoice_items_service_id', ['serviceId'])
export class InvoiceItem {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'invoice_id', type: 'bigint', nullable: false })
  invoiceId!: string;

  @ManyToOne(() => Invoice, { onDelete: 'CASCADE' })
  invoice?: Invoice;

  @Column({ name: 'service_id', type: 'bigint', nullable: true })
  serviceId!: string | null;

  @ManyToOne(() => Service, { onDelete: 'SET NULL', nullable: true })
  service?: Service;

  @Column({ type: 'text', nullable: false })
  description!: string;

  @Column({ type: 'int', nullable: false })
  quantity!: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2, nullable: false })
  unitPrice!: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 2, default: 0, nullable: false })
  discountAmount!: number;

  @Column({ name: 'line_total', type: 'decimal', precision: 10, scale: 2, nullable: false })
  lineTotal!: number;
}

import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { ServiceStatus } from '../enums/service-status.enum';

@Entity('services')
@Index('IDX_services_code_unique', ['code'], { unique: true })
@Index('IDX_services_slug_unique', ['slug'], { unique: true })
export class Service {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 100, nullable: false })
  code!: string;

  @Column({ type: 'varchar', length: 150, nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  slug!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category!: string | null;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'image_url', type: 'text', nullable: true })
  imageUrl!: string | null;

  @Column({ name: 'default_duration_minutes', type: 'int', nullable: false })
  defaultDurationMinutes!: number;

  @Column({ name: 'default_price', type: 'decimal', precision: 10, scale: 2, nullable: false })
  defaultPrice!: number;

  @Column({
    type: 'enum',
    enum: ServiceStatus,
    enumName: 'service_status',
    default: ServiceStatus.Active,
    nullable: false,
  })
  status!: ServiceStatus;

  @Column({ name: 'is_multi_session', type: 'boolean', default: false, nullable: false })
  isMultiSession!: boolean;

  @Column({ name: 'total_sessions', type: 'int', nullable: true })
  totalSessions!: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

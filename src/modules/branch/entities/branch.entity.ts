import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

@Entity('branches')
@Index('IDX_branches_name_unique', ['name'], { unique: true })
export class Branch {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ type: 'varchar', length: 150, nullable: false })
  name!: string;

  @Column({ type: 'varchar', length: 255, nullable: false })
  address!: string;

  @Column({ name: 'phone_number', type: 'varchar', length: 20, nullable: true })
  phoneNumber!: string | null;

  @Column({ type: 'double precision', nullable: false })
  latitude!: number; // RecommendationService dùng latitude để tính branch gần customer.

  @Column({ type: 'double precision', nullable: false })
  longitude!: number; // RecommendationService dùng longitude cùng latitude để tính khoảng cách.

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

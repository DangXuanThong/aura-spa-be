import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from '../enums/user-role.enum';

@Entity('users')
@Index('IDX_users_email_unique', ['email'], { unique: true })
@Index('IDX_users_phone_unique', ['phone'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string; // PostgreSQL bigint đọc về string để tránh mất precision trong JavaScript.

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  phone!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: false, select: false })
  passwordHash!: string; // Không select mặc định để tránh lộ password hash khi query user.

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role',
    default: UserRole.Customer,
  })
  role!: UserRole; // MVP chỉ có 4 role cố định nên lưu trong users, chưa cần bảng roles riêng.

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

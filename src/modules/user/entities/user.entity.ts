import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { UserRole } from '../enums/user-role.enum';
import { UserStatus } from 'src/modules/user/enums/user-status.enum';
import { AuthProvider } from 'src/modules/user/enums/auth-provider.enum';
import { Gender } from 'src/modules/user/enums/gender.enum';

@Entity('users')
@Index('IDX_users_email_unique', ['email'], { unique: true })
@Index('IDX_users_phone_unique', ['phone'], { unique: true })
export class User {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string; // PostgreSQL bigint đọc về string để tránh mất precision trong JavaScript.

  @Column({ type: 'varchar', length: 255, nullable: true })
  email!: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  phone!: string | null;

  @Column({ name: 'password_hash', type: 'varchar', length: 255, nullable: true, select: false })
  passwordHash!: string | null; // Không select mặc định để tránh lộ password hash khi query user.

  @Column({
    type: 'enum',
    enum: UserRole,
    enumName: 'user_role',
    default: UserRole.Customer,
  })
  role!: UserRole; // MVP chỉ có 4 role cố định nên lưu trong users, chưa cần bảng roles riêng.

  @Column({
    type: 'enum',
    enum: UserStatus,
    enumName: 'user_status',
    default: UserStatus.PendingVerification,
  })
  status!: UserStatus;

  @Column({
    name: 'auth_provider',
    type: 'enum',
    enum: AuthProvider,
    enumName: 'auth_provider',
    default: AuthProvider.Email,
  })
  authProvider!: AuthProvider;

  @Column({ name: 'provider_user_id', type: 'varchar', nullable: true })
  providerUserId!: string | null;

  @Column({ name: 'full_name', type: 'varchar' })
  fullName!: string;

  @Column({ name: 'avatar_url', type: 'varchar', nullable: true })
  avatarUrl!: string | null;

  @Column({
    type: 'enum',
    enum: Gender,
    enumName: 'enum',
    default: Gender.Unknown,
  })
  gender!: Gender;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth!: Date | null;

  @Column({ type: 'text', nullable: true })
  address!: string | null;

  @Column({ name: 'last_login_at', type: 'timestamptz', nullable: true })
  lastLoginAt!: Date | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}

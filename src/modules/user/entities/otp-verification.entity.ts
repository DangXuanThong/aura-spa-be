import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

@Entity('otp_verifications')
@Index('IDX_otp_target_purpose_expires', ['target', 'purpose', 'expiresAt'])
export class OtpVerification {
  @PrimaryGeneratedColumn('increment', { type: 'bigint' })
  id!: string;

  @Column({ name: 'user_id', type: 'bigint', nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user?: User;

  @Column({ type: 'varchar', nullable: false })
  target!: string; // email or phone value

  @Column({ name: 'target_type', type: 'varchar', nullable: false })
  targetType!: string; // 'email' | 'phone'

  @Column({ type: 'varchar', nullable: false })
  purpose!: string; // 'register' | 'login' | 'reset_password'

  @Column({ name: 'otp_hash', type: 'varchar', nullable: false, select: false })
  otpHash!: string;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: false })
  expiresAt!: Date;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @Column({ name: 'attempt_count', type: 'int', default: 0, nullable: false })
  attemptCount!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';
import { OtpVerification } from 'src/modules/user/entities/otp-verification.entity';
import { ERROR_CODES } from 'src/common/constants/error-codes';

@Injectable()
export class OtpService {
  private readonly OTP_TTL_MINUTES = 10;
  private readonly MAX_ATTEMPTS = 5;

  constructor(
    @InjectRepository(OtpVerification)
    private readonly otpRepo: Repository<OtpVerification>,
  ) {}

  async createOtp(userId: string, target: string, targetType: 'email' | 'phone', purpose: string, manager?: EntityManager): Promise<string> {
    const repo = manager ? manager.getRepository(OtpVerification) : this.otpRepo;

    // Invalidate any pending OTPs for this target + purpose before issuing a new one
    await repo
      .createQueryBuilder()
      .delete()
      .from(OtpVerification)
      .where('target = :target', { target })
      .andWhere('purpose = :purpose', { purpose })
      .andWhere('verified_at IS NULL')
      .execute();

    const otp = this.generateCode();
    const otpHash = await bcrypt.hash(otp, 10);
    const expiresAt = new Date(Date.now() + this.OTP_TTL_MINUTES * 60 * 1000);

    await repo.save(repo.create({ userId, target, targetType, purpose, otpHash, expiresAt, verifiedAt: null, attemptCount: 0 }));

    return otp;
  }

  async verifyOtp(target: string, purpose: string, otp: string, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(OtpVerification) : this.otpRepo;

    const record = await repo
      .createQueryBuilder('otp')
      .addSelect('otp.otpHash')
      .where('otp.target = :target', { target })
      .andWhere('otp.purpose = :purpose', { purpose })
      .andWhere('otp.verifiedAt IS NULL')
      .orderBy('otp.createdAt', 'DESC')
      .getOne();

    if (!record) {
      throw new HttpException({ code: ERROR_CODES.OTP_INVALID, message: 'No pending OTP found for this email' }, HttpStatus.BAD_REQUEST);
    }

    if (record.expiresAt < new Date()) {
      throw new HttpException({ code: ERROR_CODES.OTP_EXPIRED, message: 'OTP has expired. Please request a new one.' }, HttpStatus.BAD_REQUEST);
    }

    if (record.attemptCount >= this.MAX_ATTEMPTS) {
      throw new HttpException(
        { code: ERROR_CODES.OTP_MAX_ATTEMPTS, message: 'Too many failed attempts. Please request a new OTP.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Increment before comparing so a crash mid-check still counts
    await repo.increment({ id: record.id }, 'attemptCount', 1);

    const matches = await bcrypt.compare(otp, record.otpHash);
    if (!matches) {
      throw new HttpException({ code: ERROR_CODES.OTP_INVALID, message: 'Invalid OTP code' }, HttpStatus.BAD_REQUEST);
    }

    await repo.update(record.id, { verifiedAt: new Date() });
  }

  private generateCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredOtps(): Promise<void> {
    await this.otpRepo
      .createQueryBuilder()
      .delete()
      .from(OtpVerification)
      .where('expires_at < :now', { now: new Date() })
      .andWhere('verified_at IS NULL')
      .execute();
  }
}

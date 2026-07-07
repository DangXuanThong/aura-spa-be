import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { EventEmitter2 } from '@nestjs/event-emitter';
import * as bcrypt from 'bcryptjs';
import { QueryFailedError } from 'typeorm';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { AUTH_EVENTS } from 'src/common/constants/events';
import { UserService } from 'src/modules/user/user.service';
import { AuthProvider } from 'src/modules/user/enums/auth-provider.enum';
import { Gender } from 'src/modules/user/enums/gender.enum';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { UserStatus } from 'src/modules/user/enums/user-status.enum';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from 'src/modules/user/dto/update-profile.dto';
import { LoginResponseData, UserProfileDto } from './dto/auth-response.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { User } from 'src/modules/user/entities/user.entity';
import { OtpService } from './otp.service';
import { MailService } from 'src/modules/mail/mail.service';
import { GoogleProfile } from './strategies/google.strategy';

@Injectable()
export class AuthService {
  // In-memory token blacklist for MVP — cleared on server restart, sufficient for single-instance deployments
  private readonly tokenBlacklist = new Set<string>();

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly mailService: MailService,
    private readonly eventEmitter: EventEmitter2,
    private readonly configService: ConfigService,
  ) {}

  isTokenBlacklisted(token: string): boolean {
    return this.tokenBlacklist.has(token);
  }

  // UC01 — Register Account
  async register(dto: RegisterDto): Promise<UserProfileDto> {
    const existing = await this.userService.findByEmail(dto.email);
    if (existing) {
      throw new HttpException({ code: ERROR_CODES.EMAIL_ALREADY_EXISTS, message: 'Email is already in use' }, HttpStatus.CONFLICT);
    }

    if (dto.phone) {
      const existingPhone = await this.userService.findByPhone(dto.phone);
      if (existingPhone) {
        throw new HttpException({ code: ERROR_CODES.PHONE_ALREADY_EXISTS, message: 'Phone number is already in use' }, HttpStatus.CONFLICT);
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const normalizedEmail = dto.email.trim().toLowerCase();

    let user;
    try {
      user = await this.userService.create({
        fullName: dto.fullName,
        email: normalizedEmail,
        phone: dto.phone ?? null,
        passwordHash,
        authProvider: AuthProvider.Email,
        status: UserStatus.PendingVerification,
        gender: dto.gender ?? Gender.Unknown,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        address: dto.address ?? null,
      });
    } catch (err) {
      if (err instanceof QueryFailedError && (err as any).code === '23505') {
        throw new HttpException(
          { code: ERROR_CODES.EMAIL_ALREADY_EXISTS, message: 'Email or phone number is already in use' },
          HttpStatus.CONFLICT,
        );
      }
      throw err;
    }

    const otp = await this.otpService.createOtp(user.id, normalizedEmail, 'email', 'register');
    await this.mailService.sendOtpEmail(normalizedEmail, otp);

    // Allow conversation module to retroactively link any guest conversations with the same email
    this.eventEmitter.emit(AUTH_EVENTS.USER_REGISTERED, { userId: user.id, email: normalizedEmail });

    return this.toProfileDto(user);
  }

  // UC02 — Log In
  async login(dto: LoginDto): Promise<LoginResponseData> {
    const user = await this.userService.findByEmail(dto.email, { includePasswordHash: true });

    if (!user || !user.passwordHash) {
      throw new HttpException({ code: ERROR_CODES.INVALID_CREDENTIALS, message: 'Invalid credentials' }, HttpStatus.UNAUTHORIZED);
    }

    if (user.loginLockUntil && user.loginLockUntil.getTime() > Date.now()) {
      throw new HttpException(
        { code: 'ACCOUNT_LOCKED', message: 'Too many failed login attempts. Please try again later.' },
        HttpStatus.LOCKED,
      );
    }

    if (user.loginLockUntil && user.loginLockUntil.getTime() <= Date.now()) {
      await this.userService.update(user.id, { failedLoginCount: 0, loginLockUntil: null });
      user.failedLoginCount = 0;
      user.loginLockUntil = null;
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      const failedLoginCount = (user.failedLoginCount ?? 0) + 1;
      const lockThreshold = this.configService.get<number>('LOGIN_LOCK_THRESHOLD', 5);
      const lockMinutes = this.configService.get<number>('LOGIN_LOCK_MINUTES', 30);
      const shouldLock = failedLoginCount >= lockThreshold;

      await this.userService.update(user.id, {
        failedLoginCount,
        loginLockUntil: shouldLock ? new Date(Date.now() + lockMinutes * 60 * 1000) : null,
      });

      if (shouldLock) {
        throw new HttpException(
          { code: 'ACCOUNT_LOCKED', message: 'Too many failed login attempts. Please try again later.' },
          HttpStatus.LOCKED,
        );
      }

      throw new HttpException({ code: ERROR_CODES.INVALID_CREDENTIALS, message: 'Invalid credentials' }, HttpStatus.UNAUTHORIZED);
    }

    if (user.status === UserStatus.PendingVerification) {
      throw new HttpException(
        { code: ERROR_CODES.ACCOUNT_PENDING_VERIFICATION, message: 'Please verify your email before logging in' },
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (user.status === UserStatus.Suspended || user.status === UserStatus.Deleted) {
      throw new HttpException({ code: ERROR_CODES.ACCOUNT_INACTIVE, message: 'Account is suspended or deleted' }, HttpStatus.UNAUTHORIZED);
    }

    await this.userService.update(user.id, { failedLoginCount: 0, loginLockUntil: null, lastLoginAt: new Date() });

    let branchId: string | null = null;
    let branchCode: string | null = null;
    if (user.role === UserRole.Staff || user.role === UserRole.Manager) {
      const bi = await this.userService.getBranchInfo(user.id);
      branchId = bi.branchId;
      branchCode = bi.branchCode;
    }
    user.branchId = branchId;
    user.branchCode = branchCode;

    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role, branchId, branchCode };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: this.toProfileDto(user),
    };
  }

  // UC03 — Log Out
  logout(token: string): { message: string } {
    if (token) {
      this.tokenBlacklist.add(token);
    }
    return { message: 'Logged out successfully' };
  }

  // UC04 — Update Personal Profile
  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<UserProfileDto> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new HttpException({ code: ERROR_CODES.NOT_FOUND, message: 'User not found' }, HttpStatus.NOT_FOUND);
    }

    if (dto.phone && dto.phone !== user.phone) {
      const existingPhone = await this.userService.findByPhone(dto.phone);
      if (existingPhone) {
        throw new HttpException({ code: ERROR_CODES.PHONE_ALREADY_EXISTS, message: 'Phone number is already in use' }, HttpStatus.CONFLICT);
      }
    }

    const updates: Partial<User> = {};

    if (dto.fullName !== undefined) updates.fullName = dto.fullName;
    if (dto.phone !== undefined) updates.phone = dto.phone;
    if (dto.gender !== undefined) updates.gender = dto.gender;
    if (dto.dateOfBirth !== undefined) updates.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.address !== undefined) updates.address = dto.address;
    if (dto.avatarUrl !== undefined) updates.avatarUrl = dto.avatarUrl;
    if (dto.notificationEnabled !== undefined) updates.notificationEnabled = dto.notificationEnabled;
    if (dto.password !== undefined) {
      if (!dto.currentPassword) {
        throw new HttpException(
          { code: ERROR_CODES.VALIDATION_ERROR, message: 'Current password is required to change password' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const credentialUser = user.email
        ? await this.userService.findByEmail(user.email, { includePasswordHash: true })
        : null;

      if (!credentialUser?.passwordHash) {
        throw new HttpException(
          { code: ERROR_CODES.VALIDATION_ERROR, message: 'Password change requires an account with existing password credentials' },
          HttpStatus.BAD_REQUEST,
        );
      }

      const currentPasswordMatches = await bcrypt.compare(dto.currentPassword, credentialUser.passwordHash);
      if (!currentPasswordMatches) {
        throw new HttpException(
          { code: ERROR_CODES.INVALID_CREDENTIALS, message: 'Current password is incorrect' },
          HttpStatus.UNAUTHORIZED,
        );
      }

      updates.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    const updated = await this.userService.update(userId, updates);
    return this.toProfileDto(updated);
  }

  async verifyEmail(email: string, otp: string): Promise<UserProfileDto> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userService.findByEmail(normalizedEmail);

    if (!user) {
      throw new HttpException({ code: ERROR_CODES.NOT_FOUND, message: 'User not found' }, HttpStatus.NOT_FOUND);
    }

    if (user.status !== UserStatus.PendingVerification) {
      throw new HttpException({ code: ERROR_CODES.VALIDATION_ERROR, message: 'Account is already verified' }, HttpStatus.BAD_REQUEST);
    }

    await this.otpService.verifyOtp(normalizedEmail, 'register', otp);

    const updated = await this.userService.update(user.id, { status: UserStatus.Active });
    return this.toProfileDto(updated);
  }

  async googleLogin(profile: GoogleProfile): Promise<LoginResponseData> {
    if (!profile.email) {
      throw new HttpException({ code: ERROR_CODES.VALIDATION_ERROR, message: 'Google account has no associated email' }, HttpStatus.BAD_REQUEST);
    }

    const normalizedEmail = profile.email.trim().toLowerCase();
    let user = await this.userService.findByEmail(normalizedEmail);

    if (user) {
      if (user.status === UserStatus.Suspended || user.status === UserStatus.Deleted) {
        throw new HttpException({ code: ERROR_CODES.ACCOUNT_INACTIVE, message: 'Account is suspended or deleted' }, HttpStatus.UNAUTHORIZED);
      }
      if (user.status === UserStatus.PendingVerification) {
        user = await this.userService.update(user.id, { status: UserStatus.Active });
      }
    } else {
      user = await this.userService.create({
        fullName: profile.fullName || 'Google User',
        email: normalizedEmail,
        phone: null,
        passwordHash: null,
        authProvider: AuthProvider.Google,
        status: UserStatus.Active,
        gender: Gender.Unknown,
        dateOfBirth: null,
        address: null,
      });
    }

    if (profile.avatarUrl && !user.avatarUrl) {
      user = await this.userService.update(user.id, { avatarUrl: profile.avatarUrl });
    }

    await this.userService.update(user.id, { failedLoginCount: 0, loginLockUntil: null, lastLoginAt: new Date() });

    let branchId: string | null = null;
    let branchCode: string | null = null;
    if (user.role === UserRole.Staff || user.role === UserRole.Manager) {
      const bi = await this.userService.getBranchInfo(user.id);
      branchId = bi.branchId;
      branchCode = bi.branchCode;
    }

    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role, branchId, branchCode };
    const accessToken = this.jwtService.sign(payload);

    return { accessToken, user: this.toProfileDto(user) };
  }

  async forgotPassword(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userService.findByEmail(normalizedEmail);

    // Silently return for unknown emails or suspended/deleted accounts to prevent enumeration
    if (!user) return;
    if (user.status === UserStatus.Suspended || user.status === UserStatus.Deleted) return;

    const otp = await this.otpService.createOtp(user.id, normalizedEmail, 'email', 'reset_password');
    await this.mailService.sendOtpEmail(normalizedEmail, otp);
  }

  async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userService.findByEmail(normalizedEmail);

    if (!user) {
      throw new HttpException({ code: ERROR_CODES.NOT_FOUND, message: 'User not found' }, HttpStatus.NOT_FOUND);
    }

    if (user.status === UserStatus.Suspended || user.status === UserStatus.Deleted) {
      throw new HttpException({ code: ERROR_CODES.ACCOUNT_INACTIVE, message: 'Account is suspended or deleted' }, HttpStatus.UNAUTHORIZED);
    }

    if (user.status === UserStatus.PendingVerification) {
      throw new HttpException({ code: ERROR_CODES.ACCOUNT_INACTIVE, message: 'Account email is not verified — please verify your email before resetting your password' }, HttpStatus.FORBIDDEN);
    }

    await this.otpService.verifyOtp(normalizedEmail, 'reset_password', otp);

    await this.userService.update(user.id, { passwordHash: await bcrypt.hash(newPassword, 12) });
  }

  async resendOtp(email: string): Promise<void> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.userService.findByEmail(normalizedEmail);

    if (!user) {
      throw new HttpException({ code: ERROR_CODES.NOT_FOUND, message: 'User not found' }, HttpStatus.NOT_FOUND);
    }

    if (user.status !== UserStatus.PendingVerification) {
      throw new HttpException({ code: ERROR_CODES.VALIDATION_ERROR, message: 'Account is already verified' }, HttpStatus.BAD_REQUEST);
    }

    const otp = await this.otpService.createOtp(user.id, normalizedEmail, 'email', 'register');
    await this.mailService.sendOtpEmail(normalizedEmail, otp);
  }

  // Helper — strip sensitive fields and return public profile shape
  private toProfileDto(user: User): UserProfileDto {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      role: user.role,
      status: user.status,
      gender: user.gender,
      avatarUrl: user.avatarUrl,
      dateOfBirth: user.dateOfBirth,
      address: user.address,
      notificationEnabled: user.notificationEnabled ?? true,
      branchId: user.branchId ?? null,
      branchCode: user.branchCode ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

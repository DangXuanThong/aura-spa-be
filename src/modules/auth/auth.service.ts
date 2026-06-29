import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { ERROR_CODES } from 'src/common/constants/error-codes';
import { UserService } from 'src/modules/user/user.service';
import { AuthProvider } from 'src/modules/user/enums/auth-provider.enum';
import { Gender } from 'src/modules/user/enums/gender.enum';
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
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly otpService: OtpService,
    private readonly mailService: MailService,
  ) {}

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

    const user = await this.userService.create({
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

    const otp = await this.otpService.createOtp(user.id, normalizedEmail, 'email', 'register');
    await this.mailService.sendOtpEmail(normalizedEmail, otp);

    return this.toProfileDto(user);
  }

  // UC02 — Log In
  async login(dto: LoginDto): Promise<LoginResponseData> {
    const user = await this.userService.findByEmail(dto.email, { includePasswordHash: true });

    if (!user || !user.passwordHash) {
      throw new HttpException({ code: ERROR_CODES.INVALID_CREDENTIALS, message: 'Invalid credentials' }, HttpStatus.UNAUTHORIZED);
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
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

    await this.userService.updateLastLogin(user.id);

    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      user: this.toProfileDto(user),
    };
  }

  // UC03 — Log Out (stateless JWT: client discards token; server-side is a no-op for MVP)
  logout(): { message: string } {
    // For MVP with stateless JWT there is nothing to invalidate server-side.
    // A future iteration can add a token blacklist / refresh-token revocation here.
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
    if (dto.password !== undefined) {
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

    await this.userService.updateLastLogin(user.id);

    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };
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

    await this.otpService.verifyOtp(normalizedEmail, 'reset_password', otp);

    const updates: Partial<User> = { passwordHash: await bcrypt.hash(newPassword, 12) };
    if (user.status === UserStatus.PendingVerification) {
      updates.status = UserStatus.Active;
    }

    await this.userService.update(user.id, updates);
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
      branchId: user.branchId ?? null,
      branchCode: user.branchCode ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

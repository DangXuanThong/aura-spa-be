import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Request, Res, UseGuards } from '@nestjs/common';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiOkResponse, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { ApiResponse, buildSuccessResponse } from 'src/common/dto/api-response.dto';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendOtpDto } from './dto/resend-otp.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import {
  ForgotPasswordResponseDto,
  GetProfileResponseDto,
  LoginResponseData,
  LoginResponseDto,
  LogoutResponseDto,
  RegisterResponseDto,
  ResendOtpResponseDto,
  ResetPasswordResponseDto,
  UserProfileDto,
  VerifyEmailResponseDto,
} from './dto/auth-response.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { UpdateProfileDto } from 'src/modules/user/dto/update-profile.dto';
import { User } from 'src/modules/user/entities/user.entity';

interface RequestWithUser extends Request {
  user: User;
}

const DATE_OF_BIRTH_BAD_REQUEST_RESPONSE = {
  description: 'Validation error, including invalid dateOfBirth',
  schema: {
    example: {
      success: false,
      code: 'VALIDATION_ERROR',
      message: 'dateOfBirth must be a valid date and age must be between 10 and 100 years',
    },
  },
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  // UC01 — Register Account
  @Post('register')
  @ApiOkResponse({ type: RegisterResponseDto })
  @ApiBadRequestResponse(DATE_OF_BIRTH_BAD_REQUEST_RESPONSE)
  @ApiConflictResponse({ description: 'Email or phone already in use' })
  async register(@Body() dto: RegisterDto): Promise<ApiResponse<UserProfileDto>> {
    const user = await this.authService.register(dto);
    return buildSuccessResponse(user);
  }

  // UC02 — Log In
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials or account inactive' })
  @ApiTooManyRequestsResponse({ description: 'Too many login attempts — try again in 60 seconds' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response): Promise<ApiResponse<LoginResponseData>> {
    const result = await this.authService.login(dto);
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
    return buildSuccessResponse(result);
  }

  // UC03 — Log Out
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: LogoutResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  logout(@Request() req: any, @Res({ passthrough: true }) res: Response): ApiResponse<{ message: string }> {
    const cookie = req.cookies?.['access_token'] as string | undefined;
    const token = cookie ?? (req.headers?.authorization?.split(' ')[1] ?? '');
    res.clearCookie('access_token', { path: '/' });
    const result = this.authService.logout(token);
    return buildSuccessResponse(result);
  }

  // UC04 (GET) — View Personal Profile
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: GetProfileResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  getProfile(@Request() req: RequestWithUser): ApiResponse<UserProfileDto> {
    // user is already attached by JwtStrategy.validate()
    const { passwordHash: _pw, ...safeUser } = req.user as User & { passwordHash?: string };
    return buildSuccessResponse(safeUser as UserProfileDto);
  }

  // UC04 (PATCH) — Update Personal Profile
  @Patch('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: GetProfileResponseDto })
  @ApiBadRequestResponse(DATE_OF_BIRTH_BAD_REQUEST_RESPONSE)
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiConflictResponse({ description: 'Phone number already in use' })
  async updateProfile(@Request() req: RequestWithUser, @Body() dto: UpdateProfileDto): Promise<ApiResponse<UserProfileDto>> {
    const updated = await this.authService.updateProfile(req.user.id, dto);
    return buildSuccessResponse(updated);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOkResponse({ type: VerifyEmailResponseDto })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts — try again in 60 seconds' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<ApiResponse<UserProfileDto>> {
    const user = await this.authService.verifyEmail(dto.email, dto.otp);
    return buildSuccessResponse(user);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOkResponse({ type: ResendOtpResponseDto })
  @ApiTooManyRequestsResponse({ description: 'Too many OTP requests — try again in 60 seconds' })
  async resendOtp(@Body() dto: ResendOtpDto): Promise<ApiResponse<{ message: string }>> {
    await this.authService.resendOtp(dto.email);
    return buildSuccessResponse({ message: 'OTP sent' });
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOkResponse({ type: ForgotPasswordResponseDto })
  @ApiTooManyRequestsResponse({ description: 'Too many requests — try again in 60 seconds' })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<ApiResponse<{ message: string }>> {
    await this.authService.forgotPassword(dto.email);
    return buildSuccessResponse({ message: 'If the email is registered, an OTP has been sent' });
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOkResponse({ type: ResetPasswordResponseDto })
  @ApiTooManyRequestsResponse({ description: 'Too many attempts — try again in 60 seconds' })
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<ApiResponse<{ message: string }>> {
    await this.authService.resetPassword(dto.email, dto.otp, dto.newPassword);
    return buildSuccessResponse({ message: 'Password reset successfully' });
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  googleAuth(): void {
    // Guard redirects to Google — body never executes
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  async googleCallback(@Request() req: RequestWithUser, @Res() res: Response): Promise<void> {
    const result = await this.authService.googleLogin(req.user as any);
    const isProduction = this.configService.get<string>('NODE_ENV') === 'production';
    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    res.redirect(`${frontendUrl}/auth/callback`);
  }
}

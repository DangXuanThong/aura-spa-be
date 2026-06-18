import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, Request, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiConflictResponse, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
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
  @ApiConflictResponse({ description: 'Email or phone already in use' })
  async register(@Body() dto: RegisterDto): Promise<ApiResponse<UserProfileDto>> {
    const user = await this.authService.register(dto);
    return buildSuccessResponse(user);
  }

  // UC02 — Log In
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials or account inactive' })
  async login(@Body() dto: LoginDto): Promise<ApiResponse<LoginResponseData>> {
    const result = await this.authService.login(dto);
    return buildSuccessResponse(result);
  }

  // UC03 — Log Out
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOkResponse({ type: LogoutResponseDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  logout(): ApiResponse<{ message: string }> {
    const result = this.authService.logout();
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
  @ApiUnauthorizedResponse({ description: 'Missing or invalid token' })
  @ApiConflictResponse({ description: 'Phone number already in use' })
  async updateProfile(@Request() req: RequestWithUser, @Body() dto: UpdateProfileDto): Promise<ApiResponse<UserProfileDto>> {
    const updated = await this.authService.updateProfile(req.user.id, dto);
    return buildSuccessResponse(updated);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: VerifyEmailResponseDto })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<ApiResponse<UserProfileDto>> {
    const user = await this.authService.verifyEmail(dto.email, dto.otp);
    return buildSuccessResponse(user);
  }

  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ResendOtpResponseDto })
  async resendOtp(@Body() dto: ResendOtpDto): Promise<ApiResponse<{ message: string }>> {
    await this.authService.resendOtp(dto.email);
    return buildSuccessResponse({ message: 'OTP sent' });
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ForgotPasswordResponseDto })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<ApiResponse<{ message: string }>> {
    await this.authService.forgotPassword(dto.email);
    return buildSuccessResponse({ message: 'If the email is registered, an OTP has been sent' });
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ResetPasswordResponseDto })
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
    const frontendUrl = this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    const url = new URL(`${frontendUrl}/auth/callback`);
    url.searchParams.set('accessToken', result.accessToken);
    res.redirect(url.toString());
  }
}

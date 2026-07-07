import { ApiProperty } from '@nestjs/swagger';
import { Gender } from 'src/modules/user/enums/gender.enum';
import { UserRole } from 'src/modules/user/enums/user-role.enum';
import { UserStatus } from 'src/modules/user/enums/user-status.enum';

export class UserProfileDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: 'Nguyen Van A' })
  fullName!: string;

  @ApiProperty({ example: 'user@example.com', nullable: true })
  email!: string | null;

  @ApiProperty({ example: '0901234567', nullable: true })
  phone!: string | null;

  @ApiProperty({ enum: UserRole, example: UserRole.Customer })
  role!: UserRole;

  @ApiProperty({ enum: UserStatus, example: UserStatus.Active })
  status!: UserStatus;

  @ApiProperty({ enum: Gender, example: Gender.Unknown })
  gender!: Gender;

  @ApiProperty({ example: null, nullable: true })
  avatarUrl!: string | null;

  @ApiProperty({ example: null, nullable: true })
  dateOfBirth!: Date | null;

  @ApiProperty({ example: null, nullable: true })
  address!: string | null;

  @ApiProperty({ example: true })
  notificationEnabled!: boolean;

  @ApiProperty({ example: '1', nullable: true, required: false })
  branchId?: string | null;

  @ApiProperty({ example: 'HCM-Q1', nullable: true, required: false })
  branchCode?: string | null;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  updatedAt!: Date;
}

export class LoginResponseData {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty()
  user!: UserProfileDto;
}

export class LoginResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty()
  data!: LoginResponseData;
}

export class RegisterResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty()
  data!: UserProfileDto;
}

export class LogoutResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: { message: 'Logged out successfully' } })
  data!: { message: string };
}

export class GetProfileResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty()
  data!: UserProfileDto;
}

export class VerifyEmailResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty()
  data!: UserProfileDto;
}

export class ResendOtpResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: { message: 'OTP sent' } })
  data!: { message: string };
}

export class ForgotPasswordResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: { message: 'If the email is registered, an OTP has been sent' } })
  data!: { message: string };
}

export class ResetPasswordResponseDto {
  @ApiProperty({ example: true })
  success!: true;

  @ApiProperty({ example: { message: 'Password reset successfully' } })
  data!: { message: string };
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP sent to the email address' })
  @IsString()
  @Length(6, 6)
  otp!: string;

  @ApiProperty({ example: 'NewPassword123!' })
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  newPassword!: string;
}

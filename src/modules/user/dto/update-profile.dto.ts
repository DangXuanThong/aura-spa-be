import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUrl, Matches, MaxLength, MinLength } from 'class-validator';
import { IsDateOfBirth } from 'src/common/validators/date-of-birth.validator';
import { Gender } from 'src/modules/user/enums/gender.enum';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Nguyen Van B' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fullName?: string;

  @ApiPropertyOptional({ example: '0123456789' })
  @IsOptional()
  @Matches(/^\d{10}$/, { message: 'phone must be a 10-digit number' })
  phone?: string;

  @ApiPropertyOptional({ enum: Gender, example: Gender.Female })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ example: '1995-05-15' })
  @IsOptional()
  @IsDateOfBirth()
  dateOfBirth?: string;

  @ApiPropertyOptional({ example: '456 Le Loi, Da Nang' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: true, description: 'Enable booking and account notifications' })
  @IsOptional()
  @IsBoolean()
  notificationEnabled?: boolean;

  @ApiPropertyOptional({ example: 'CurrentPassword123!', description: 'Required when changing password' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  currentPassword?: string;

  @ApiPropertyOptional({ example: 'NewPassword123!', description: 'Leave blank to keep current password' })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(255)
  password?: string;
}

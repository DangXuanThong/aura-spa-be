import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
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
  @IsString()
  @Matches(/^[0-9]{10}$/, { message: 'phone must be a 10-digit number' })
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
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional({ example: 'NewPassword123!', description: 'Leave blank to keep current password' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  password?: string;
}

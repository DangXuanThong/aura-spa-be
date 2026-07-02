import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsOptional, IsString, Matches } from 'class-validator';
import { Gender } from 'src/modules/user/enums/gender.enum';
import { StaffPosition } from '../enums/staff-position.enum';

export class UpdateStaffDto {
  @ApiPropertyOptional({ example: 'Nguyen Van An' })
  @IsOptional()
  @IsString()
  fullName?: string;

  @ApiPropertyOptional({ example: 'an.nguyen@aura-spa.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @Matches(/^\d{10}$/, { message: 'phone must be a 10-digit number' })
  phone?: string;

  @ApiPropertyOptional({ enum: Gender, enumName: 'Gender' })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ enum: StaffPosition, enumName: 'StaffPosition' })
  @IsOptional()
  @IsEnum(StaffPosition)
  position?: StaffPosition;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { Gender } from 'src/modules/user/enums/gender.enum';
import { StaffPosition } from '../enums/staff-position.enum';

export class CreateStaffDto {
  @ApiProperty({ example: 'Nguyen Van An' })
  @IsNotEmpty()
  @IsString()
  fullName!: string;

  @ApiProperty({ example: 'an.nguyen@aura-spa.com' })
  @IsEmail()
  email!: string;

  @ApiPropertyOptional({ example: '0901234567' })
  @IsOptional()
  @Matches(/^\d{10}$/, { message: 'phone must be a 10-digit number' })
  phone?: string;

  @ApiPropertyOptional({ enum: Gender, enumName: 'Gender', example: Gender.Female })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiProperty({ enum: StaffPosition, enumName: 'StaffPosition', example: StaffPosition.Technician })
  @IsEnum(StaffPosition)
  position!: StaffPosition;

  @ApiPropertyOptional({ example: '2026-06-18', description: 'Defaults to today if omitted' })
  @IsOptional()
  @IsDateString()
  startDate?: string;
}

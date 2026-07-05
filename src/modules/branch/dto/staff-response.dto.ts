import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { Gender } from 'src/modules/user/enums/gender.enum';
import { UserStatus } from 'src/modules/user/enums/user-status.enum';
import { StaffPosition } from '../enums/staff-position.enum';
import { StaffStatus } from '../enums/staff-status.enum';

export class StaffUserResponseDto {
  @ApiProperty({ example: '5' })
  id!: string;

  @ApiProperty({ example: 'Nguyen Van An' })
  fullName!: string;

  @ApiPropertyOptional({ example: 'an.nguyen@aura-spa.com' })
  email!: string | null;

  @ApiPropertyOptional({ example: '0901234567' })
  phone!: string | null;

  @ApiProperty({ enum: Gender, enumName: 'Gender' })
  gender!: Gender;

  @ApiProperty({ enum: UserStatus, enumName: 'UserStatus' })
  status!: UserStatus;
}

export class StaffResponseDto {
  @ApiProperty({ example: '10' })
  id!: string;

  @ApiPropertyOptional({ example: 'STF-HCM-Q1-004' })
  staffCode!: string | null;

  @ApiProperty({ enum: StaffPosition, enumName: 'StaffPosition' })
  position!: StaffPosition;

  @ApiProperty({ enum: StaffStatus, enumName: 'StaffStatus' })
  status!: StaffStatus;

  @ApiProperty({ example: '2026-06-18' })
  startDate!: Date;

  @ApiPropertyOptional({ example: null })
  endDate!: Date | null;

  @ApiProperty({ type: StaffUserResponseDto })
  @Type(() => StaffUserResponseDto)
  user!: StaffUserResponseDto;

  @ApiPropertyOptional({ example: 4.8 })
  rating?: number | null;

  @ApiProperty({ example: '2026-06-18T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-18T10:00:00.000Z' })
  updatedAt!: Date;
}

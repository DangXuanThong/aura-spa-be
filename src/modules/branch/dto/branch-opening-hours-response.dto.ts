import { ApiProperty } from '@nestjs/swagger';

export class BranchOpeningHoursResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '1' })
  branchId!: string;

  @ApiProperty({ example: 1, description: '0 = Sunday, 6 = Saturday' })
  dayOfWeek!: number;

  @ApiProperty({ example: '09:00:00' })
  openTime!: string;

  @ApiProperty({ example: '20:00:00' })
  closeTime!: string;

  @ApiProperty({ example: false })
  isClosed!: boolean;
}

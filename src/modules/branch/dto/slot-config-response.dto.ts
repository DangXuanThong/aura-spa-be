import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SlotConfigResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiProperty({ example: '1' })
  branchId!: string;

  @ApiProperty({ example: 1, description: '0 = Sunday, 6 = Saturday' })
  dayOfWeek!: number;

  @ApiProperty({ example: '09:00' })
  startTime!: string;

  @ApiProperty({ example: '20:00' })
  endTime!: string;

  @ApiProperty({ example: 60, description: 'Slot interval in minutes' })
  slotMinutes!: number;

  @ApiProperty({ example: 3, description: 'Max concurrent bookings per slot' })
  maxBookings!: number;

  @ApiProperty({ example: '2025-01-01' })
  effectiveFrom!: Date;

  @ApiPropertyOptional({ example: null })
  effectiveTo!: Date | null;

  @ApiProperty({ example: '2026-06-18T10:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2026-06-18T10:00:00.000Z' })
  updatedAt!: Date;
}

import { ApiProperty } from '@nestjs/swagger';

export class TimeSlotDto {
  @ApiProperty({ example: '09:00' })
  startTime!: string;

  @ApiProperty({ example: '10:30' })
  endTime!: string;

  @ApiProperty({ example: true })
  available!: boolean;

  @ApiProperty({ example: 3, description: 'How many more bookings can be accepted for this slot' })
  remainingCapacity!: number;

  @ApiProperty({ example: 5 })
  maxCapacity!: number;
}

export class AvailableSlotsResponseDto {
  @ApiProperty({ example: '1' })
  branchId!: string;

  @ApiProperty({ example: '2' })
  serviceId!: string;

  @ApiProperty({ example: '2026-06-20' })
  date!: string;

  @ApiProperty({ example: 90 })
  serviceDurationMinutes!: number;

  @ApiProperty({ type: [TimeSlotDto] })
  slots!: TimeSlotDto[];
}

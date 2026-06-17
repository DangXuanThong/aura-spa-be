import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingStatus } from 'src/modules/booking/enums/booking-status.enum';
import { StaffShiftResponseDto } from './staff-shift-response.dto';

export class TimetableAppointmentDto {
  @ApiProperty({ example: '10' })
  id!: string;

  @ApiProperty({ example: '42' })
  customerId!: string;

  @ApiProperty({ example: 'Nguyen Thi Lan' })
  customerName!: string;

  @ApiPropertyOptional({ example: '0901111001' })
  customerPhone!: string | null;

  @ApiProperty({ example: '2026-06-20T03:00:00.000Z' })
  startTime!: Date;

  @ApiProperty({ example: '2026-06-20T04:00:00.000Z' })
  endTime!: Date;

  @ApiProperty({ enum: BookingStatus, enumName: 'BookingStatus' })
  status!: BookingStatus;
}

export class TimetableDayDto {
  @ApiProperty({ example: '2026-06-20' })
  date!: string;

  @ApiProperty({ type: [StaffShiftResponseDto] })
  shifts!: StaffShiftResponseDto[];

  @ApiProperty({ type: [TimetableAppointmentDto] })
  appointments!: TimetableAppointmentDto[];
}

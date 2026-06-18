import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ScheduleRequestResponseDto } from './schedule-request-response.dto';

export class ScheduleRequestManagerResponseDto extends ScheduleRequestResponseDto {
  @ApiProperty({ example: 'Vo Thi Thu' })
  staffFullName!: string;

  @ApiPropertyOptional({ example: 'thu.vo@aura-spa.com' })
  staffEmail!: string | null;
}

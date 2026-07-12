import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: '1', description: 'Branch to book at' })
  @IsNotEmpty()
  @IsString()
  branchId!: string;

  @ApiProperty({ example: '2', description: 'Service to book' })
  @IsNotEmpty()
  @IsString()
  serviceId!: string;

  @ApiPropertyOptional({ example: '7', description: 'Preferred technician (must be assigned to the branch)' })
  @IsOptional()
  @IsString()
  technicianId?: string;

  @ApiProperty({ example: '2026-06-20T09:00:00+07:00', description: 'Booking start time (ISO 8601)' })
  @IsDateString()
  startTime!: string;

  @ApiPropertyOptional({ example: 'Please use fragrance-free products.' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'WELCOME2026', description: 'Discount or promotional code to apply at booking time' })
  @IsOptional()
  @IsString()
  discountCode?: string;

  @ApiPropertyOptional({
    example: '12',
    description: 'Treatment course to continue. When provided, the booking is linked to the next planned session of this course.',
  })
  @IsOptional()
  @IsString()
  treatmentCourseId?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateComplaintDto {
  @ApiPropertyOptional({ example: '42', description: 'Booking being complained about. If omitted, branchId is required.' })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({ example: '7', description: 'Branch receiving this complaint. Required when bookingId is omitted.' })
  @IsOptional()
  @IsString()
  branchId?: string;

  @ApiProperty({ example: 'Service experience feedback' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  title!: string;

  @ApiProperty({ example: 'The appointment wait time was too long and the staff did not explain the delay clearly.' })
  @IsNotEmpty()
  @IsString()
  description!: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class GenerateInvoiceDto {
  @ApiProperty({ example: '42', description: 'ID of the checked-in or in-service booking' })
  @IsNotEmpty()
  @IsString()
  bookingId!: string;

  @ApiPropertyOptional({ example: 'Counter payment — cash' })
  @IsOptional()
  @IsString()
  notes?: string;
}
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class ConsumeStockDto {
  @ApiProperty({ example: '3', description: 'Inventory item ID' })
  @IsNotEmpty()
  @IsString()
  inventoryItemId!: string;

  @ApiProperty({ example: 2.5, description: 'Quantity consumed (must be positive)' })
  @IsPositive()
  quantity!: number;

  @ApiPropertyOptional({ example: '12', description: 'Booking ID (optional)' })
  @IsOptional()
  @IsString()
  bookingId?: string;

  @ApiPropertyOptional({ example: '5', description: 'Service ID (optional)' })
  @IsOptional()
  @IsString()
  serviceId?: string;

  @ApiPropertyOptional({ example: 'Used during facial treatment' })
  @IsOptional()
  @IsString()
  reason?: string;
}

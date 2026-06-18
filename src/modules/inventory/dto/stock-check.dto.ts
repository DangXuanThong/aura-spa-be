import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Min } from 'class-validator';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class StockCheckDto {
  @ApiProperty({ example: '3', description: 'Inventory item ID' })
  @IsNotEmpty()
  @IsString()
  inventoryItemId!: string;

  @ApiProperty({ example: 45.5, description: 'Actual quantity counted during stock check (must be >= 0)' })
  @Min(0)
  actualQuantity!: number;

  @ApiPropertyOptional({ example: 'Weekly stock check' })
  @IsOptional()
  @IsString()
  reason?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsPositive, IsString } from 'class-validator';

export class ImportStockDto {
  @ApiProperty({ example: '3', description: 'Inventory item ID' })
  @IsNotEmpty()
  @IsString()
  inventoryItemId!: string;

  @ApiProperty({ example: 50, description: 'Quantity to import (must be positive)' })
  @IsPositive()
  quantity!: number;

  @ApiPropertyOptional({ example: 'Monthly restock from supplier' })
  @IsOptional()
  @IsString()
  reason?: string;
}

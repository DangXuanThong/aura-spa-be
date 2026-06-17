import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InvoiceItemResponseDto {
  @ApiProperty({ example: '1' })
  id!: string;

  @ApiPropertyOptional({ example: '2' })
  serviceId!: string | null;

  @ApiProperty({ example: 'Chăm sóc da mặt cơ bản' })
  description!: string;

  @ApiProperty({ example: 1 })
  quantity!: number;

  @ApiProperty({ example: 350000 })
  unitPrice!: number;

  @ApiProperty({ example: 0 })
  discountAmount!: number;

  @ApiProperty({ example: 350000 })
  lineTotal!: number;
}
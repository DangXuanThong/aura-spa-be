import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class ApplyDiscountDto {
  @ApiProperty({ example: 'WELCOME2026', description: 'Discount or promotional code to apply' })
  @IsNotEmpty()
  @IsString()
  code!: string;
}

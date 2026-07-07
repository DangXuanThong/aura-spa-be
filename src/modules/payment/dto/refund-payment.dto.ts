import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, MaxLength, Min } from 'class-validator';

export class RefundPaymentDto {
  @ApiProperty({ example: 50000, description: 'Amount to refund — must be ≤ (original amount − already refunded)' })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiProperty({ example: 'Customer cancelled — deposit returned', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  reason!: string;
}

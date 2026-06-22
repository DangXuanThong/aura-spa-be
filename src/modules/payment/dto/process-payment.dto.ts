import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, Min } from 'class-validator';
import { PaymentMethod } from '../enums/payment-method.enum';
import { PaymentType } from '../enums/payment-type.enum';

export class ProcessPaymentDto {
  @ApiProperty({ enum: PaymentMethod, enumName: 'PaymentMethod', example: PaymentMethod.Cash })
  @IsEnum(PaymentMethod)
  paymentMethod!: PaymentMethod;

  @ApiProperty({ example: 350000, description: 'Amount received at the counter' })
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({ enum: PaymentType, enumName: 'PaymentType', example: PaymentType.FullPayment })
  @IsOptional()
  @IsEnum(PaymentType)
  paymentType?: PaymentType;
}

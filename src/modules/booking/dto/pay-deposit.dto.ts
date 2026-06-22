import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaymentMethod } from 'src/modules/payment/enums/payment-method.enum';

export class PayDepositDto {
  @ApiPropertyOptional({ enum: PaymentMethod, enumName: 'PaymentMethod', example: PaymentMethod.EWallet })
  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;
}

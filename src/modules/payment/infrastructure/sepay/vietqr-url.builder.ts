import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SepayConfig } from './sepay.config';

export interface VietQrParams {
  account: string;
  bank: string;
  amount: number;
  description: string;
  template?: 'compact' | 'qronly' | 'standee' | '';
}

@Injectable()
export class VietQrUrlBuilder {
  private static readonly BASE_URL = 'https://qr.sepay.vn/img';

  constructor(private readonly configService: ConfigService) {}

  build(params: VietQrParams): string {
    const searchParams = new URLSearchParams({
      acc: params.account,
      bank: params.bank,
      amount: String(Math.round(params.amount)),
      des: params.description,
      template: params.template ?? 'compact',
    });

    return `${VietQrUrlBuilder.BASE_URL}?${searchParams.toString()}`;
  }

  buildFromConfig(referenceCode: string, amount: number): string {
    const config = this.configService.get<SepayConfig>('sepay', { infer: true })!;

    if (!config.bankAccount) {
      throw new Error('SEPAY_BANK_ACCOUNT is not configured');
    }

    return this.build({
      account: config.bankAccount,
      bank: config.bankCode,
      amount,
      description: referenceCode,
      template: 'compact',
    });
  }
}

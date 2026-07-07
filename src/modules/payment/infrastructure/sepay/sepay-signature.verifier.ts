import { createHmac, timingSafeEqual } from 'crypto';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SepayConfig } from './sepay.config';

const REPLAY_TOLERANCE_SECONDS = 300;

/**
 * Verifies SePay webhook HMAC-SHA256 signature.
 * @see https://developer.sepay.vn/vi/sepay-webhooks/xac-thuc
 *
 * Signature = sha256= HMAC_SHA256(secret, "{timestamp}.{raw_body}")
 * Headers: X-SePay-Signature, X-SePay-Timestamp
 */
@Injectable()
export class SePaySignatureVerifier {
  constructor(private readonly configService: ConfigService) {}

  verify(signatureHeader: string | undefined, timestampHeader: string | undefined, rawBody: Buffer): void {
    const config = this.configService.get<SepayConfig>('sepay', { infer: true })!;
    const secret = config.webhookSecret;

    if (!secret) {
      throw new UnauthorizedException('Webhook secret is not configured');
    }

    if (!signatureHeader || !timestampHeader) {
      throw new UnauthorizedException('Missing SePay signature headers');
    }

    const timestamp = Number.parseInt(timestampHeader, 10);
    if (Number.isNaN(timestamp)) {
      throw new UnauthorizedException('Invalid SePay timestamp');
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    if (Math.abs(nowSeconds - timestamp) > REPLAY_TOLERANCE_SECONDS) {
      throw new UnauthorizedException('Request expired');
    }

    // Must sign the raw bytes exactly as received — never JSON.stringify(parsed body).
    const bodyString = rawBody.toString('utf8');
    const expected =
      'sha256=' + createHmac('sha256', secret).update(`${timestamp}.${bodyString}`).digest('hex');

    const expectedBuffer = Buffer.from(expected);
    const receivedBuffer = Buffer.from(signatureHeader);

    if (expectedBuffer.length !== receivedBuffer.length || !timingSafeEqual(expectedBuffer, receivedBuffer)) {
      throw new UnauthorizedException('Invalid signature');
    }
  }
}

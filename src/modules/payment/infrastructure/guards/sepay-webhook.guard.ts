import { timingSafeEqual } from 'crypto';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { SePaySignatureVerifier } from '../sepay/sepay-signature.verifier';
import { SepayConfig } from '../sepay/sepay.config';

export type RawBodyRequest = Request & { rawBody?: Buffer };

/**
 * Validates X-SePay-Signature + X-SePay-Timestamp against the raw request body.
 * Requires NestFactory.create({ rawBody: true }) in main.ts.
 */
@Injectable()
export class SePayWebhookGuard implements CanActivate {
  constructor(
    private readonly signatureVerifier: SePaySignatureVerifier,
    private readonly configService: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RawBodyRequest>();
    const rawBody = request.rawBody;

    if (!rawBody || rawBody.length === 0) {
      throw new UnauthorizedException('Empty request body');
    }

    if (this.hasValidApiKey(request.headers.authorization)) {
      return true;
    }

    const signature = request.headers['x-sepay-signature'] as string | undefined;
    const timestamp = request.headers['x-sepay-timestamp'] as string | undefined;

    this.signatureVerifier.verify(signature, timestamp, rawBody);
    return true;
  }

  private hasValidApiKey(authorizationHeader: string | string[] | undefined): boolean {
    const header = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
    const token = header?.match(/^(apikey|bearer)\s+(.+)$/i)?.[2]?.trim();
    if (!token) {
      return false;
    }

    const config = this.configService.get<SepayConfig>('sepay', { infer: true })!;
    const secret = config.webhookSecret;
    if (!secret) {
      throw new UnauthorizedException('Webhook secret is not configured');
    }

    const expected = Buffer.from(secret);
    const received = Buffer.from(token);
    return expected.length === received.length && timingSafeEqual(expected, received);
  }
}

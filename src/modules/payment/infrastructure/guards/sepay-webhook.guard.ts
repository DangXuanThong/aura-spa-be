import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { SePaySignatureVerifier } from '../sepay/sepay-signature.verifier';

export type RawBodyRequest = Request & { rawBody?: Buffer };

/**
 * Validates X-SePay-Signature + X-SePay-Timestamp against the raw request body.
 * Requires NestFactory.create({ rawBody: true }) in main.ts.
 */
@Injectable()
export class SePayWebhookGuard implements CanActivate {
  constructor(private readonly signatureVerifier: SePaySignatureVerifier) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RawBodyRequest>();
    const rawBody = request.rawBody;

    if (!rawBody || rawBody.length === 0) {
      throw new UnauthorizedException('Empty request body');
    }

    const signature = request.headers['x-sepay-signature'] as string | undefined;
    const timestamp = request.headers['x-sepay-timestamp'] as string | undefined;

    this.signatureVerifier.verify(signature, timestamp, rawBody);
    return true;
  }
}

import { Body, Controller, HttpCode, HttpStatus, Post, Req, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { ConfirmPaymentFromWebhookCommand } from '../../application/commands/confirm-payment-from-webhook.command';
import { ConfirmPaymentFromWebhookHandler } from '../../application/handlers/confirm-payment-from-webhook.handler';
import { SePayWebhookGuard, RawBodyRequest } from '../guards/sepay-webhook.guard';
import { SePayWebhookPayload } from '../sepay/sepay-webhook-payload.interface';

/**
 * Public webhook endpoint — no JWT.
 * SePay requires HTTP 200/201 with body exactly {"success": true}.
 * @see https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook
 */
@ApiExcludeController()
@Controller('webhooks')
export class SePayWebhookController {
  constructor(private readonly confirmPaymentHandler: ConfirmPaymentFromWebhookHandler) {}

  @Post('sepay')
  @HttpCode(HttpStatus.OK)
  @UseGuards(SePayWebhookGuard)
  async handleWebhook(@Req() req: RawBodyRequest, @Body() payload: SePayWebhookPayload): Promise<{ success: true }> {
    // Guard already verified HMAC on req.rawBody. Body is parsed for convenience only.
    const rawPayload = JSON.parse(req.rawBody!.toString('utf8')) as Record<string, unknown>;

    await this.confirmPaymentHandler.execute(new ConfirmPaymentFromWebhookCommand(payload, rawPayload));

    return { success: true };
  }
}

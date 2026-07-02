import { SePayWebhookPayload } from '../../infrastructure/sepay/sepay-webhook-payload.interface';

export class ConfirmPaymentFromWebhookCommand {
  constructor(
    readonly payload: SePayWebhookPayload,
    readonly rawPayload: Record<string, unknown>,
  ) {}
}

/** Payload posted by SePay — https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook */
export interface SePayWebhookPayload {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  subAccount?: string | null;
  code: string | null;
  content: string;
  transferType: 'in' | 'out';
  description?: string;
  transferAmount: number;
  accumulated?: number;
  referenceCode?: string;
}

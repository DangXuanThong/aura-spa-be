export interface LoyaltyTransactionResponseDto {
  id: string;
  bookingId: string | null;
  paymentId: string | null;
  type: string;
  points: number;
  source: string;
  description: string | null;
  createdAt: Date;
}

export interface LoyaltySummaryDto {
  tier: string;
  pointsBalance: number;
  lifetimePoints: number;
  earnRateVnd: number;
  redeemValueVnd: number;
  nextTier: string | null;
  nextTierPoints: number | null;
  transactions: LoyaltyTransactionResponseDto[];
}

export interface RedeemPointsResponseDto {
  pointsRedeemed: number;
  valueVnd: number;
  pointsBalance: number;
  tier: string;
}

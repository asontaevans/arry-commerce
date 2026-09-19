/** Shared domain types for Arry commerce. */

export type ProductTier = 'v1' | 'v2' | 'v3';

export type ProductKind = 'subscription' | 'one_time';

export type EntitlementStatus =
  | 'active'
  | 'revoked'
  | 'held'
  | 'cooldown'
  | 'none';

export type FraudDecision =
  | 'allow'
  | 'hold'
  | 'block'
  | 'revoke'
  | 'cooldown';

export interface ProductDefinition {
  id: string;
  tier: ProductTier;
  kind: ProductKind;
  name: string;
  description: string;
  /** Amount in USD cents (catalog display; live price comes from Stripe). */
  unitAmountCents: number;
  currency: 'usd';
  /** Env key holding the Stripe Price ID placeholder. */
  stripePriceEnvKey: string;
  /** Interval for subscriptions. */
  interval?: 'month' | 'year';
  /** Launch vs standard for V1 alerts. */
  pricingPhase?: 'launch' | 'standard';
  /** Soft upsell / marketing notes — never includes balances/NAV. */
  marketingNotes?: string[];
  discordRoleGrant?: boolean;
}

export interface CheckoutIdentity {
  email: string;
  discordId?: string;
  ip?: string;
  cardFingerprint?: string;
}

export interface VelocityCounters {
  email: number;
  discordId: number;
  ip: number;
  cardFingerprint: number;
}

export interface FraudCheckInput {
  email: string;
  discordId?: string;
  ip?: string;
  cardFingerprint?: string;
  paymentMethodType?: string;
  isPrepaid?: boolean;
  isSubscription?: boolean;
  stripeEventId?: string;
}

export interface FraudCheckResult {
  decision: FraudDecision;
  reason: string;
  velocity?: VelocityCounters;
}

export interface EntitlementRecord {
  id: string;
  email: string;
  discordId?: string;
  productId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePaymentId?: string;
  status: EntitlementStatus;
  grantedAt?: string;
  revokedAt?: string;
  revokeReason?: string;
  holdReason?: string;
  cooldownUntil?: string;
  updatedAt: string;
}

export interface ProcessedEventRecord {
  eventId: string;
  type: string;
  processedAt: string;
  outcome: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  paymentId?: string;
  customerId?: string;
  discordId?: string;
  email?: string;
  decision: FraudDecision | string;
  reason: string;
  eventType?: string;
  meta?: Record<string, unknown>;
}

export interface AdminHoldItem {
  id: string;
  createdAt: string;
  email: string;
  discordId?: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  meta?: Record<string, unknown>;
}

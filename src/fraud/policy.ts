/**
 * Configurable fraud policy applied to ALL Stripe payment methods
 * (Checkout, Payment Links, Subscriptions, Apple Pay, Google Pay, Link, card, SEPA, …).
 */

import { config } from '../config';

export const FRAUD_POLICY = {
  version: '1.0.0',
  windowHours: 24,
  velocity: {
    maxPerEmail: () => config.fraud.velocityMaxPerEmail,
    maxPerDiscord: () => config.fraud.velocityMaxPerDiscord,
    maxPerIp: () => config.fraud.velocityMaxPerIp,
    maxPerCardFingerprint: () => config.fraud.velocityMaxPerCardFingerprint,
  },
  disputeCooldownDays: () => config.fraud.disputeCooldownDays,
  blockPrepaidForSubscriptions: () =>
    config.fraud.blockPrepaidForSubscriptions,
  /** Same card fingerprint on multiple Discord accounts → hold grant. */
  holdOnSharedCardFingerprint: true,
  /** Soft path: prefer hold + admin review over hard block when ambiguous. */
  preferHoldWhenAmbiguous: true,
  /** Events that grant entitlements (server-side only). */
  grantEvents: [
    'checkout.session.completed',
    'invoice.paid',
    'customer.subscription.updated',
  ] as const,
  /** Events that revoke entitlements. */
  revokeEvents: [
    'charge.dispute.created',
    'invoice.payment_failed',
    'customer.subscription.deleted',
  ] as const,
} as const;

export type FraudPolicy = typeof FRAUD_POLICY;

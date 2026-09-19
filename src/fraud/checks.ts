import { config } from '../config';
import { store } from '../store/memoryStore';
import type { FraudCheckInput, FraudCheckResult, VelocityCounters } from '../types';
import { FRAUD_POLICY } from './policy';

const WINDOW_MS = FRAUD_POLICY.windowHours * 60 * 60 * 1000;

function velocitySnapshot(input: FraudCheckInput): VelocityCounters {
  return {
    email: store.countVelocity('email', input.email, WINDOW_MS),
    discordId: input.discordId
      ? store.countVelocity('discord', input.discordId, WINDOW_MS)
      : 0,
    ip: input.ip ? store.countVelocity('ip', input.ip, WINDOW_MS) : 0,
    cardFingerprint: input.cardFingerprint
      ? store.countVelocity('card', input.cardFingerprint, WINDOW_MS)
      : 0,
  };
}

/**
 * Pre-grant fraud gates. Call after Stripe signature verification,
 * before Discord role grant.
 */
export function evaluateFraud(input: FraudCheckInput): FraudCheckResult {
  const email = input.email?.trim().toLowerCase();
  if (!email) {
    return { decision: 'block', reason: 'missing_email' };
  }

  // Dispute cool-down (email)
  if (store.isInCooldown(`email:${email}`)) {
    return {
      decision: 'cooldown',
      reason: `email_dispute_cooldown_${FRAUD_POLICY.disputeCooldownDays()}d`,
    };
  }

  // Dispute cool-down (discord)
  if (input.discordId && store.isInCooldown(`discord:${input.discordId}`)) {
    return {
      decision: 'cooldown',
      reason: `discord_dispute_cooldown_${FRAUD_POLICY.disputeCooldownDays()}d`,
    };
  }

  // Prepaid block for subscriptions (Radar-adjacent configurable rule)
  if (
    input.isSubscription &&
    input.isPrepaid &&
    FRAUD_POLICY.blockPrepaidForSubscriptions()
  ) {
    return { decision: 'block', reason: 'prepaid_blocked_for_subscription' };
  }

  const velocity = velocitySnapshot(input);

  if (velocity.email >= FRAUD_POLICY.velocity.maxPerEmail()) {
    return {
      decision: 'block',
      reason: 'velocity_email_exceeded',
      velocity,
    };
  }
  if (
    input.discordId &&
    velocity.discordId >= FRAUD_POLICY.velocity.maxPerDiscord()
  ) {
    return {
      decision: 'block',
      reason: 'velocity_discord_exceeded',
      velocity,
    };
  }
  if (input.ip && velocity.ip >= FRAUD_POLICY.velocity.maxPerIp()) {
    return {
      decision: 'block',
      reason: 'velocity_ip_exceeded',
      velocity,
    };
  }
  if (
    input.cardFingerprint &&
    velocity.cardFingerprint >= FRAUD_POLICY.velocity.maxPerCardFingerprint()
  ) {
    return {
      decision: 'block',
      reason: 'velocity_card_fingerprint_exceeded',
      velocity,
    };
  }

  // Same card → multiple Discord accounts = flag + hold
  if (
    FRAUD_POLICY.holdOnSharedCardFingerprint &&
    input.cardFingerprint &&
    input.discordId
  ) {
    const seen = store.trackCardDiscord(
      input.cardFingerprint,
      input.discordId
    );
    if (seen.size > 1) {
      return {
        decision: 'hold',
        reason: 'card_fingerprint_shared_across_discord_accounts',
        velocity,
      };
    }
  }

  return { decision: 'allow', reason: 'passed_fraud_gates', velocity };
}

/** Record a successful checkout toward velocity limits. */
export function recordSuccessfulCheckout(input: FraudCheckInput): void {
  store.recordVelocity('email', input.email);
  if (input.discordId) store.recordVelocity('discord', input.discordId);
  if (input.ip) store.recordVelocity('ip', input.ip);
  if (input.cardFingerprint) store.recordVelocity('card', input.cardFingerprint);
}

/** Apply 30-day cool-down after dispute. */
export function applyDisputeCooldown(email: string, discordId?: string): string {
  const days = config.fraud.disputeCooldownDays;
  const until = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  store.setCooldown(`email:${email}`, until);
  if (discordId) store.setCooldown(`discord:${discordId}`, until);
  return until;
}

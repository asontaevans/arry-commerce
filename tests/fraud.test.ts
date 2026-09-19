import { beforeEach, describe, expect, it } from 'vitest';
import {
  applyDisputeCooldown,
  evaluateFraud,
  recordSuccessfulCheckout,
} from '../src/fraud';
import { store } from '../src/store/memoryStore';
import { config } from '../src/config';

beforeEach(() => {
  store.reset();
});

describe('evaluateFraud', () => {
  it('blocks missing email', () => {
    const r = evaluateFraud({ email: '' });
    expect(r.decision).toBe('block');
    expect(r.reason).toBe('missing_email');
  });

  it('allows clean checkout', () => {
    const r = evaluateFraud({
      email: 'trader@example.com',
      discordId: '111',
      ip: '1.2.3.4',
    });
    expect(r.decision).toBe('allow');
  });

  it('enforces email velocity', () => {
    const email = 'fast@example.com';
    for (let i = 0; i < config.fraud.velocityMaxPerEmail; i++) {
      recordSuccessfulCheckout({ email, discordId: `d${i}` });
    }
    const r = evaluateFraud({ email, discordId: 'd999' });
    expect(r.decision).toBe('block');
    expect(r.reason).toBe('velocity_email_exceeded');
  });

  it('holds when same card fingerprint used across discord accounts', () => {
    const card = 'fp_abc';
    evaluateFraud({
      email: 'a@example.com',
      discordId: 'discord_a',
      cardFingerprint: card,
    });
    const r = evaluateFraud({
      email: 'b@example.com',
      discordId: 'discord_b',
      cardFingerprint: card,
    });
    expect(r.decision).toBe('hold');
    expect(r.reason).toBe('card_fingerprint_shared_across_discord_accounts');
  });

  it('blocks prepaid for subscriptions when configured', () => {
    const r = evaluateFraud({
      email: 'prepaid@example.com',
      isSubscription: true,
      isPrepaid: true,
    });
    expect(r.decision).toBe('block');
    expect(r.reason).toBe('prepaid_blocked_for_subscription');
  });

  it('applies dispute cooldown', () => {
    applyDisputeCooldown('disputed@example.com', 'disc_1');
    const byEmail = evaluateFraud({ email: 'disputed@example.com' });
    expect(byEmail.decision).toBe('cooldown');
    const byDiscord = evaluateFraud({
      email: 'other@example.com',
      discordId: 'disc_1',
    });
    expect(byDiscord.decision).toBe('cooldown');
  });
});

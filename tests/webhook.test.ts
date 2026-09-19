import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';
import {
  WebhookSignatureError,
  constructEvent,
  handleStripeEvent,
} from '../src/stripe/webhookHandler';
import { store } from '../src/store/memoryStore';
import * as stripeClient from '../src/stripe/client';

beforeEach(() => {
  store.reset();
  vi.restoreAllMocks();
});

function fakeEvent(
  type: string,
  object: Record<string, unknown>,
  id = `evt_${type}_${Math.random().toString(36).slice(2, 8)}`
): Stripe.Event {
  return {
    id,
    object: 'event',
    type,
    data: { object },
    api_version: '2024-06-20',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    pending_webhooks: 0,
    request: null,
  } as unknown as Stripe.Event;
}

describe('constructEvent signature verification', () => {
  it('rejects missing signature', () => {
    expect(() => constructEvent(Buffer.from('{}'), undefined)).toThrow(
      WebhookSignatureError
    );
  });

  it('rejects bad signature', () => {
    vi.spyOn(stripeClient, 'getStripe').mockReturnValue({
      webhooks: {
        constructEvent: () => {
          throw new Error('No signatures found matching the expected signature');
        },
      },
    } as unknown as ReturnType<typeof stripeClient.getStripe>);

    expect(() =>
      constructEvent(Buffer.from('{"id":"evt_x"}'), 't=1,v1=bad')
    ).toThrow(WebhookSignatureError);
  });

  it('accepts verified event from stripe constructEvent', () => {
    const evt = fakeEvent('checkout.session.completed', {});
    vi.spyOn(stripeClient, 'getStripe').mockReturnValue({
      webhooks: {
        constructEvent: () => evt,
      },
    } as unknown as ReturnType<typeof stripeClient.getStripe>);

    const out = constructEvent(Buffer.from('{}'), 't=1,v1=good');
    expect(out.id).toBe(evt.id);
  });
});

describe('handleStripeEvent', () => {
  it('is idempotent on duplicate event.id', async () => {
    const evt = fakeEvent('checkout.session.completed', {
      id: 'cs_test_1',
      mode: 'subscription',
      customer_email: 'dup@example.com',
      metadata: { discord_id: '999', product_id: 'alerts-premium-launch' },
      customer: 'cus_1',
      subscription: 'sub_1',
    });

    const first = await handleStripeEvent(evt);
    expect(first.duplicate).toBe(false);
    expect(first.outcome).toMatch(/grant_/);

    const second = await handleStripeEvent(evt);
    expect(second.duplicate).toBe(true);
    expect(second.outcome).toBe('duplicate_ignored');
  });

  it('grants entitlement on checkout.session.completed', async () => {
    const evt = fakeEvent('checkout.session.completed', {
      id: 'cs_test_2',
      mode: 'subscription',
      customer_details: { email: 'buyer@example.com' },
      metadata: {
        discord_id: 'discord_buyer',
        product_id: 'alerts-premium-launch',
      },
      customer: 'cus_2',
      subscription: 'sub_2',
    });

    const result = await handleStripeEvent(evt);
    expect(result.outcome).toBe('grant_allow');
    const ents = store.findEntitlementsByDiscord('discord_buyer');
    expect(ents.some((e) => e.status === 'active')).toBe(true);
  });

  it('revokes and cools down on charge.dispute.created', async () => {
    // seed active entitlement
    store.upsertEntitlement({
      email: 'disputer@example.com',
      discordId: 'discord_disputer',
      productId: 'alerts-premium-launch',
      status: 'active',
      grantedAt: new Date().toISOString(),
    });

    const evt = fakeEvent('charge.dispute.created', {
      id: 'dp_1',
      charge: 'ch_1',
      amount: 2900,
      currency: 'usd',
      reason: 'fraudulent',
      evidence: {},
      metadata: {
        email: 'disputer@example.com',
        discord_id: 'discord_disputer',
      },
    });

    const result = await handleStripeEvent(evt);
    expect(result.outcome).toBe('revoked_dispute_cooldown');

    const ents = store.findEntitlementsByDiscord('discord_disputer');
    expect(ents.every((e) => e.status === 'cooldown' || e.status === 'revoked')).toBe(
      true
    );
    expect(store.isInCooldown('email:disputer@example.com')).toBe(true);
    expect(store.isInCooldown('discord:discord_disputer')).toBe(true);
  });

  it('revokes on invoice.payment_failed', async () => {
    store.upsertEntitlement({
      email: 'fail@example.com',
      discordId: 'discord_fail',
      productId: 'alerts-premium-launch',
      status: 'active',
      grantedAt: new Date().toISOString(),
    });

    const evt = fakeEvent('invoice.payment_failed', {
      id: 'in_fail',
      customer_email: 'fail@example.com',
      customer: 'cus_fail',
      metadata: { discord_id: 'discord_fail' },
    });

    const result = await handleStripeEvent(evt);
    expect(result.outcome).toBe('revoked_payment_failed');
    const ents = store.findEntitlementsByDiscord('discord_fail');
    expect(ents.every((e) => e.status === 'revoked')).toBe(true);
  });

  it('revokes on customer.subscription.deleted', async () => {
    store.upsertEntitlement({
      email: 'cancel@example.com',
      discordId: 'discord_cancel',
      productId: 'alerts-premium-launch',
      status: 'active',
      grantedAt: new Date().toISOString(),
    });

    const evt = fakeEvent('customer.subscription.deleted', {
      id: 'sub_cancel',
      customer: 'cus_cancel',
      status: 'canceled',
      metadata: {
        email: 'cancel@example.com',
        discord_id: 'discord_cancel',
      },
    });

    const result = await handleStripeEvent(evt);
    expect(result.outcome).toBe('revoked_subscription_deleted');
  });
});

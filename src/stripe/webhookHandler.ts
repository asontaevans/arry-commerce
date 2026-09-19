/**
 * Stripe webhook: signature verify → idempotency → fraud gates → grant/revoke.
 * Applies to ALL payment methods (Checkout, Subscriptions, wallets, SEPA, …).
 */

import type Stripe from 'stripe';
import { grantEntitlement, revokeEntitlements } from '../entitlements/service';
import { store } from '../store/memoryStore';
import { getStripe } from './client';
import { config } from '../config';

export class WebhookSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WebhookSignatureError';
  }
}

export function constructEvent(
  rawBody: Buffer | string,
  signature: string | undefined,
  webhookSecret = config.stripe.webhookSecret
): Stripe.Event {
  if (!signature) {
    throw new WebhookSignatureError('missing_stripe_signature');
  }
  try {
    return getStripe().webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'invalid_signature';
    throw new WebhookSignatureError(msg);
  }
}

function meta(obj: { metadata?: Stripe.Metadata | null } | null | undefined) {
  return obj?.metadata ?? {};
}

function pickDiscordId(...sources: Array<Stripe.Metadata | null | undefined>): string | undefined {
  for (const m of sources) {
    const id = m?.discord_id || m?.discordId;
    if (id) return id;
  }
  return undefined;
}

function pickProductId(...sources: Array<Stripe.Metadata | null | undefined>): string {
  for (const m of sources) {
    const id = m?.product_id || m?.productId;
    if (id) return id;
  }
  return 'alerts-premium-launch';
}

export interface HandleResult {
  duplicate: boolean;
  outcome: string;
  detail?: unknown;
}

export async function handleStripeEvent(
  event: Stripe.Event
): Promise<HandleResult> {
  // Idempotency: ignore duplicate event.id
  if (store.hasProcessedEvent(event.id)) {
    return { duplicate: true, outcome: 'duplicate_ignored' };
  }

  let outcome = 'unhandled';
  let detail: unknown;

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const email =
          session.customer_details?.email ||
          session.customer_email ||
          meta(session).email ||
          '';
        const discordId = pickDiscordId(meta(session));
        const productId = pickProductId(meta(session));
        const result = await grantEntitlement({
          email,
          discordId,
          ip: meta(session).client_ip,
          cardFingerprint: meta(session).card_fingerprint,
          isPrepaid: meta(session).is_prepaid === 'true',
          isSubscription: session.mode === 'subscription',
          productId,
          stripeCustomerId:
            typeof session.customer === 'string'
              ? session.customer
              : session.customer?.id,
          stripeSubscriptionId:
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription?.id,
          stripePaymentId:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : undefined,
          eventType: event.type,
          stripeEventId: event.id,
        });
        outcome = `grant_${result.decision}`;
        detail = result;
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const email = invoice.customer_email || meta(invoice).email || '';
        const discordId = pickDiscordId(meta(invoice));
        const productId = pickProductId(meta(invoice));
        const result = await grantEntitlement({
          email,
          discordId,
          productId,
          isSubscription: true,
          stripeCustomerId:
            typeof invoice.customer === 'string'
              ? invoice.customer
              : invoice.customer?.id,
          stripeSubscriptionId:
            typeof invoice.subscription === 'string'
              ? invoice.subscription
              : invoice.subscription?.id,
          stripePaymentId:
            typeof invoice.payment_intent === 'string'
              ? invoice.payment_intent
              : undefined,
          eventType: event.type,
          stripeEventId: event.id,
        });
        outcome = `grant_${result.decision}`;
        detail = result;
        break;
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const status = sub.status;
        const email = meta(sub).email || '';
        const discordId = pickDiscordId(meta(sub));
        if (status === 'active' || status === 'trialing') {
          const result = await grantEntitlement({
            email: email || `sub_${sub.id}@placeholder.local`,
            discordId,
            productId: pickProductId(meta(sub)),
            isSubscription: true,
            stripeCustomerId:
              typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
            stripeSubscriptionId: sub.id,
            eventType: event.type,
            stripeEventId: event.id,
          });
          outcome = `grant_${result.decision}`;
          detail = result;
        } else if (
          status === 'canceled' ||
          status === 'unpaid' ||
          status === 'past_due'
        ) {
          const result = await revokeEntitlements({
            email: email || undefined,
            discordId,
            reason: `subscription_${status}`,
            eventType: event.type,
            customerId:
              typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
          });
          outcome = 'revoked';
          detail = result;
        } else {
          outcome = `subscription_status_${status}_noop`;
        }
        break;
      }

      case 'charge.dispute.created': {
        const dispute = event.data.object as Stripe.Dispute;
        const charge = dispute.charge;
        const email = meta(dispute).email || '';
        const discordId = pickDiscordId(meta(dispute));
        // Evidence pack stub in audit
        store.appendAudit({
          email: email || undefined,
          discordId,
          paymentId: typeof charge === 'string' ? charge : charge?.id,
          decision: 'revoke',
          reason: 'dispute_evidence_pack_logged',
          eventType: event.type,
          meta: {
            disputeId: dispute.id,
            amount: dispute.amount,
            currency: dispute.currency,
            reason: dispute.reason,
            evidence: dispute.evidence,
          },
        });
        const result = await revokeEntitlements({
          email: email || undefined,
          discordId,
          reason: 'charge_dispute_created',
          eventType: event.type,
          paymentId: typeof charge === 'string' ? charge : charge?.id,
          applyCooldown: true,
        });
        outcome = 'revoked_dispute_cooldown';
        detail = result;
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const email = invoice.customer_email || meta(invoice).email || '';
        const discordId = pickDiscordId(meta(invoice));
        const result = await revokeEntitlements({
          email: email || undefined,
          discordId,
          reason: 'invoice_payment_failed',
          eventType: event.type,
          customerId:
            typeof invoice.customer === 'string'
              ? invoice.customer
              : invoice.customer?.id,
        });
        outcome = 'revoked_payment_failed';
        detail = result;
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const email = meta(sub).email || '';
        const discordId = pickDiscordId(meta(sub));
        const result = await revokeEntitlements({
          email: email || undefined,
          discordId,
          reason: 'subscription_deleted',
          eventType: event.type,
          customerId:
            typeof sub.customer === 'string' ? sub.customer : sub.customer?.id,
        });
        outcome = 'revoked_subscription_deleted';
        detail = result;
        break;
      }

      default:
        outcome = `ignored_${event.type}`;
    }
  } catch (err) {
    outcome = 'handler_error';
    detail = err instanceof Error ? err.message : String(err);
    store.markEventProcessed(event.id, event.type, outcome);
    throw err;
  }

  store.markEventProcessed(event.id, event.type, outcome);
  return { duplicate: false, outcome, detail };
}

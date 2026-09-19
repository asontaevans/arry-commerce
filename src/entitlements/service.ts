/**
 * Server-side entitlements — never trust client redirects or "I paid" claims.
 */

import { grantPremiumRole, revokePremiumRole } from '../discord/roles';
import {
  applyDisputeCooldown,
  evaluateFraud,
  recordSuccessfulCheckout,
} from '../fraud';
import { store } from '../store/memoryStore';
import type { EntitlementRecord, FraudCheckInput } from '../types';

export interface GrantInput extends FraudCheckInput {
  productId: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePaymentId?: string;
  eventType?: string;
}

export interface GrantOutcome {
  entitlement?: EntitlementRecord;
  decision: string;
  reason: string;
  discord?: Awaited<ReturnType<typeof grantPremiumRole>>;
}

export async function grantEntitlement(input: GrantInput): Promise<GrantOutcome> {
  const fraud = evaluateFraud(input);

  store.appendAudit({
    email: input.email,
    discordId: input.discordId,
    customerId: input.stripeCustomerId,
    paymentId: input.stripePaymentId,
    decision: fraud.decision,
    reason: fraud.reason,
    eventType: input.eventType,
    meta: { velocity: fraud.velocity, productId: input.productId },
  });

  if (fraud.decision === 'block' || fraud.decision === 'cooldown') {
    return { decision: fraud.decision, reason: fraud.reason };
  }

  if (fraud.decision === 'hold') {
    store.addHold({
      email: input.email,
      discordId: input.discordId,
      reason: fraud.reason,
      meta: { productId: input.productId, paymentId: input.stripePaymentId },
    });
    const entitlement = store.upsertEntitlement({
      email: input.email,
      discordId: input.discordId,
      productId: input.productId,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      stripePaymentId: input.stripePaymentId,
      status: 'held',
      holdReason: fraud.reason,
    });
    return {
      entitlement,
      decision: 'hold',
      reason: fraud.reason,
    };
  }

  // allow
  recordSuccessfulCheckout(input);

  const entitlement = store.upsertEntitlement({
    email: input.email,
    discordId: input.discordId,
    productId: input.productId,
    stripeCustomerId: input.stripeCustomerId,
    stripeSubscriptionId: input.stripeSubscriptionId,
    stripePaymentId: input.stripePaymentId,
    status: 'active',
    grantedAt: new Date().toISOString(),
  });

  if (input.productId.startsWith('alerts-premium') && input.discordId) {
    store.activePremiumCount = Math.max(
      store.activePremiumCount,
      store.findActiveByDiscord(input.discordId).length
        ? store.activePremiumCount
        : store.activePremiumCount
    );
    // recount actives for alerts products
    const actives = [...store.entitlements.values()].filter(
      (e) => e.status === 'active' && e.productId.startsWith('alerts-premium')
    );
    store.activePremiumCount = new Set(
      actives.map((e) => e.discordId || e.email)
    ).size;

    const discord = await grantPremiumRole(input.discordId);
    return {
      entitlement,
      decision: 'allow',
      reason: fraud.reason,
      discord,
    };
  }

  return { entitlement, decision: 'allow', reason: fraud.reason };
}

export interface RevokeInput {
  email?: string;
  discordId?: string;
  reason: string;
  eventType?: string;
  paymentId?: string;
  customerId?: string;
  applyCooldown?: boolean;
}

export async function revokeEntitlements(
  input: RevokeInput
): Promise<{ revoked: EntitlementRecord[]; discord?: Awaited<ReturnType<typeof revokePremiumRole>> }> {
  const targets = new Set<EntitlementRecord>();
  if (input.email) {
    for (const e of store.findEntitlementsByEmail(input.email)) targets.add(e);
  }
  if (input.discordId) {
    for (const e of store.findEntitlementsByDiscord(input.discordId))
      targets.add(e);
  }

  const revoked: EntitlementRecord[] = [];
  for (const e of targets) {
    if (e.status === 'revoked') continue;
    const updated = store.upsertEntitlement({
      ...e,
      status: 'revoked',
      revokedAt: new Date().toISOString(),
      revokeReason: input.reason,
    });
    revoked.push(updated);
  }

  // recount premium
  const actives = [...store.entitlements.values()].filter(
    (e) => e.status === 'active' && e.productId.startsWith('alerts-premium')
  );
  store.activePremiumCount = new Set(
    actives.map((e) => e.discordId || e.email)
  ).size;

  let discord;
  if (input.discordId) {
    discord = await revokePremiumRole(input.discordId);
  } else {
    // revoke for each discord id found
    const ids = [
      ...new Set(revoked.map((r) => r.discordId).filter(Boolean) as string[]),
    ];
    for (const id of ids) {
      discord = await revokePremiumRole(id);
    }
  }

  if (input.applyCooldown && input.email) {
    const until = applyDisputeCooldown(input.email, input.discordId);
    for (const e of revoked) {
      store.upsertEntitlement({
        ...e,
        status: 'cooldown',
        cooldownUntil: until,
        revokeReason: input.reason,
        revokedAt: e.revokedAt,
      });
    }
  }

  store.appendAudit({
    email: input.email,
    discordId: input.discordId,
    paymentId: input.paymentId,
    customerId: input.customerId,
    decision: input.applyCooldown ? 'cooldown' : 'revoke',
    reason: input.reason,
    eventType: input.eventType,
    meta: { revokedCount: revoked.length },
  });

  return { revoked, discord };
}

export function getEntitlementStatus(discordId: string): {
  active: boolean;
  entitlements: EntitlementRecord[];
} {
  const entitlements = store.findEntitlementsByDiscord(discordId);
  return {
    active: entitlements.some((e) => e.status === 'active'),
    entitlements,
  };
}

/**
 * Product catalog V1–V3.
 * Hard rule: never expose trading balances / NAV in customer-facing copy.
 */

import { config } from '../config';
import type { ProductDefinition } from '../types';

export const PRODUCTS: ProductDefinition[] = [
  {
    id: 'alerts-premium-launch',
    tier: 'v1',
    kind: 'subscription',
    name: 'Arry Alerts Discord Premium (Launch)',
    description:
      'Full access to #premium-alerts, #premium-charts, and #premium-recap. Launch pricing while we grow the first 50 members.',
    unitAmountCents: 2900,
    currency: 'usd',
    stripePriceEnvKey: 'STRIPE_PRICE_ALERTS_LAUNCH',
    interval: 'month',
    pricingPhase: 'launch',
    discordRoleGrant: true,
    marketingNotes: [
      'Free teaser: #watchlist + #active-trades',
      'Premium: live alerts, charts, and weekly recap channels',
      'Education and process only — no live equity figures',
    ],
  },
  {
    id: 'alerts-premium-standard',
    tier: 'v1',
    kind: 'subscription',
    name: 'Arry Alerts Discord Premium',
    description:
      'Full access to #premium-alerts, #premium-charts, and #premium-recap after launch cohort.',
    unitAmountCents: 4900,
    currency: 'usd',
    stripePriceEnvKey: 'STRIPE_PRICE_ALERTS_STANDARD',
    interval: 'month',
    pricingPhase: 'standard',
    discordRoleGrant: true,
    marketingNotes: [
      'Same premium channels as launch plan',
      'Standard rate after 50 paying members',
    ],
  },
  {
    id: 'guide-starter',
    tier: 'v2',
    kind: 'one_time',
    name: 'Starter Guide PDF',
    description:
      'One-time digital guide: foundations for reading markets with Arry’s process — no account numbers or live equity figures.',
    unitAmountCents: 1900,
    currency: 'usd',
    stripePriceEnvKey: 'STRIPE_PRICE_GUIDE_STARTER',
  },
  {
    id: 'guide-options-flow',
    tier: 'v2',
    kind: 'one_time',
    name: 'Options Flow Primer',
    description:
      'Digital primer on reading options flow and unusual activity — educational only.',
    unitAmountCents: 2900,
    currency: 'usd',
    stripePriceEnvKey: 'STRIPE_PRICE_GUIDE_OPTIONS',
  },
  {
    id: 'guide-session-sniper',
    tier: 'v2',
    kind: 'one_time',
    name: 'Session Sniper Playbook',
    description:
      'Paper-honest session playbook for structuring trades. Positioning concepts without live balances.',
    unitAmountCents: 3900,
    currency: 'usd',
    stripePriceEnvKey: 'STRIPE_PRICE_GUIDE_SESSION',
  },
  {
    id: 'newsletter-weekly',
    tier: 'v3',
    kind: 'subscription',
    name: 'Arry Weekly Newsletter',
    description:
      'Weekly market + trade storytelling email. Soft upsell to Discord Premium — no live equity disclosures.',
    unitAmountCents: 900,
    currency: 'usd',
    stripePriceEnvKey: 'STRIPE_PRICE_NEWSLETTER',
    interval: 'month',
    marketingNotes: [
      'Story-first recap of the week',
      'CTA into Discord Premium when ready',
    ],
  },
];

const PRICE_ENV_MAP: Record<string, string> = {
  STRIPE_PRICE_ALERTS_LAUNCH: config.stripe.prices.alertsLaunch,
  STRIPE_PRICE_ALERTS_STANDARD: config.stripe.prices.alertsStandard,
  STRIPE_PRICE_GUIDE_STARTER: config.stripe.prices.guideStarter,
  STRIPE_PRICE_GUIDE_OPTIONS: config.stripe.prices.guideOptions,
  STRIPE_PRICE_GUIDE_SESSION: config.stripe.prices.guideSession,
  STRIPE_PRICE_NEWSLETTER: config.stripe.prices.newsletter,
};

export function resolveStripePriceId(product: ProductDefinition): string {
  return PRICE_ENV_MAP[product.stripePriceEnvKey] ?? product.stripePriceEnvKey;
}

export function getProductById(id: string): ProductDefinition | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getProductsByTier(tier: ProductDefinition['tier']): ProductDefinition[] {
  return PRODUCTS.filter((p) => p.tier === tier);
}

/**
 * Pick V1 alerts price: launch ($29) until member cap, then standard ($49).
 */
export function selectAlertsProduct(activeMemberCount: number): ProductDefinition {
  const launch = PRODUCTS.find((p) => p.id === 'alerts-premium-launch')!;
  const standard = PRODUCTS.find((p) => p.id === 'alerts-premium-standard')!;
  return activeMemberCount < config.alertsLaunchMemberCap ? launch : standard;
}

export function catalogForApi(activeMemberCount: number) {
  const alerts = selectAlertsProduct(activeMemberCount);
  return {
    products: PRODUCTS.map((p) => ({
      ...p,
      stripePriceId: resolveStripePriceId(p),
      activeForCheckout:
        p.tier !== 'v1' ||
        p.id === alerts.id ||
        (p.pricingPhase === undefined),
    })),
    activeAlertsProductId: alerts.id,
    launchMemberCap: config.alertsLaunchMemberCap,
    activePremiumCount: activeMemberCount,
    discordInvite: config.discord.inviteUrl,
    freeChannels: {
      watchlist: config.discord.channels.watchlist,
      activeTrades: config.discord.channels.activeTrades,
    },
    complianceNote:
      'Customer content never includes trading account balances or NAV.',
  };
}

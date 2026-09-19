import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function env(key: string, fallback = ''): string {
  return process.env[key] ?? fallback;
}

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : fallback;
}

function envBool(key: string, fallback: boolean): boolean {
  const raw = process.env[key];
  if (raw === undefined || raw === '') return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.toLowerCase());
}

export const config = {
  port: envInt('PORT', 3000),
  nodeEnv: env('NODE_ENV', 'development'),
  baseUrl: env('BASE_URL', 'http://localhost:3000'),

  stripe: {
    secretKey: env('STRIPE_SECRET_KEY', 'sk_test_REPLACE_ME'),
    publishableKey: env('STRIPE_PUBLISHABLE_KEY', 'pk_test_REPLACE_ME'),
    webhookSecret: env('STRIPE_WEBHOOK_SECRET', 'whsec_REPLACE_ME'),
    prices: {
      alertsLaunch: env('STRIPE_PRICE_ALERTS_LAUNCH', 'price_alerts_launch_29'),
      alertsStandard: env(
        'STRIPE_PRICE_ALERTS_STANDARD',
        'price_alerts_standard_49'
      ),
      guideStarter: env('STRIPE_PRICE_GUIDE_STARTER', 'price_guide_starter'),
      guideOptions: env('STRIPE_PRICE_GUIDE_OPTIONS', 'price_guide_options'),
      guideSession: env('STRIPE_PRICE_GUIDE_SESSION', 'price_guide_session'),
      newsletter: env('STRIPE_PRICE_NEWSLETTER', 'price_newsletter_monthly'),
    },
  },

  alertsLaunchMemberCap: envInt('ALERTS_LAUNCH_MEMBER_CAP', 50),

  discord: {
    botToken: env('DISCORD_BOT_TOKEN'),
    guildId: env('DISCORD_GUILD_ID'),
    premiumRoleId: env('DISCORD_PREMIUM_ROLE_ID'),
    inviteUrl: env('DISCORD_INVITE_URL', 'https://discord.gg/svQZGsxJtD'),
    channels: {
      watchlist: env('DISCORD_CHANNEL_WATCHLIST', '1550682674744533055'),
      activeTrades: env(
        'DISCORD_CHANNEL_ACTIVE_TRADES',
        '1550993031606435963'
      ),
    },
  },

  fraud: {
    velocityMaxPerEmail: envInt('VELOCITY_MAX_PER_EMAIL', 3),
    velocityMaxPerDiscord: envInt('VELOCITY_MAX_PER_DISCORD', 2),
    velocityMaxPerIp: envInt('VELOCITY_MAX_PER_IP', 5),
    velocityMaxPerCardFingerprint: envInt('VELOCITY_MAX_PER_CARD_FINGERPRINT', 2),
    disputeCooldownDays: envInt('DISPUTE_COOLDOWN_DAYS', 30),
    blockPrepaidForSubscriptions: envBool(
      'BLOCK_PREPAID_FOR_SUBSCRIPTIONS',
      true
    ),
  },

  adminReviewWebhookUrl: env('ADMIN_REVIEW_WEBHOOK_URL'),
} as const;

export type AppConfig = typeof config;

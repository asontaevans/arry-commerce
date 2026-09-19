# arry-commerce

Production-shaped TypeScript service for **Arry Alerts** commerce: Stripe Checkout/Subscriptions, Discord Premium entitlements, and fraud protection for **all** Stripe payment methods.

Built for SCALER while Stripe account setup completes. No live secrets in this repo.

## Stack

- **Node 18+ / TypeScript / Express**
- Stripe SDK (webhooks + Checkout Sessions)
- In-memory store for local/dev (swap for Postgres/Redis before multi-instance prod)
- Vitest unit tests

## Products (V1–V3)

| Tier | Product | Price (catalog) | Kind |
|------|---------|-----------------|------|
| V1 | Discord Premium (launch) | $29/mo | Subscription |
| V1 | Discord Premium (standard) | $49/mo after 50 members | Subscription |
| V2 | Starter Guide / Options Flow / Session Sniper | one-time | Payment |
| V3 | Weekly newsletter | subscription | Subscription |

**Hard rule:** customer content never exposes trading balances or NAV.

Discord invite (copy only): https://discord.gg/svQZGsxJtD  
Free channel IDs: watchlist `1550682674744533055`, active-trades `1550993031606435963`.

## Quick start

```bash
cd arry-commerce
cp .env.example .env
npm install
npm test
npm run dev
```

- Landing: http://localhost:3000  
- Start here: http://localhost:3000/start-here  
- Catalog API: `GET /api/catalog`  
- Fraud policy: `GET /api/fraud/policy`  
- Stripe webhook: `POST /api/webhooks/stripe`


## Legal pages (Stripe business website)

Public URLs for Discord-first / e-commerce onboarding:

| Page | URL | Source |
|------|-----|--------|
| Landing (Arry Alerts) | `/` | `public/index.html` |
| Terms of Service | `/legal/terms` | `content/legal/TERMS_OF_SERVICE.md` |
| Privacy Policy | `/legal/privacy` | `content/legal/PRIVACY_POLICY.md` |
| Start here | `/start-here` | `public/start-here.html` + `content/start-here.md` |

Static HTML mirrors also live under `public/legal/*.html`. Use the live site root (not only the Discord invite) as the **Stripe business website** URL once deployed.

### Non-lawyer draft disclaimer (README only)

> The Terms of Service and Privacy Policy in this repository are **operational drafts prepared for product scaffolding**. They are **not legal advice** and have **not been reviewed by an attorney**. Before taking payments in production, have qualified counsel adapt them to your entity, jurisdiction, and consumer-protection rules. The public `/legal/*` pages intentionally read as real policies for Stripe/Discord readiness; this disclaimer belongs in the README for operators, not on the customer-facing pages.

## Wire live Stripe (when A finishes account)

1. Create Products + Prices in Stripe Dashboard (test mode first).
2. Put real values in `.env`:
   - `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_PRICE_ALERTS_LAUNCH`, `STRIPE_PRICE_ALERTS_STANDARD`, guide + newsletter price IDs
   - `STRIPE_WEBHOOK_SECRET` from the webhook endpoint or Stripe CLI
3. Forward webhooks locally:
   ```bash
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```
4. Dashboard → Radar: block high-risk, require 3DS for elevated risk; optionally block prepaid for subscriptions.
5. Subscribe webhook events at minimum:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.payment_failed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `charge.dispute.created`
6. Discord bot: set `DISCORD_BOT_TOKEN`, `DISCORD_GUILD_ID`, `DISCORD_PREMIUM_ROLE_ID` (until set, grant/revoke is a safe stub).

Checkout metadata must include `discord_id` and `product_id` (the `/api/checkout` route sets these).

## Fraud module (all payment methods)

- Webhook signature verification (reject unsigned / bad sig)
- Idempotent `event.id` handling
- Velocity limits: email, Discord ID, IP, card fingerprint (24h window, env-configurable)
- Shared card fingerprint → multiple Discord accounts = **hold** + admin queue
- Auto-revoke on dispute / failed payment / subscription canceled
- 30-day cool-down after dispute
- Server-side entitlements only — never trust client “I paid”

See [docs/FRAUD_POLICY.md](docs/FRAUD_POLICY.md).

## Key routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Liveness + config flags |
| GET | `/api/catalog` | V1–V3 catalog + active alerts price |
| POST | `/api/checkout` | Create Checkout Session (or stub if no key) |
| POST | `/api/webhooks/stripe` | Verified webhook intake |
| GET | `/api/entitlements/:discordId` | Server entitlement status |
| GET | `/api/admin/holds` | Fraud hold queue |
| GET | `/api/admin/audit` | Decision audit log |

## Tests

```bash
npm test
```

Covers: signature failure, duplicate events, grant on checkout, revoke on dispute (+ cooldown), revoke on payment failed / subscription deleted, velocity + catalog rules.

## TODOs for production

- [ ] Replace in-memory store with Postgres (+ Redis for velocity)
- [ ] Paste live/test Stripe keys and Price IDs
- [ ] Enable Radar rules in Stripe Dashboard
- [ ] Configure Discord bot role grant for real guild
- [ ] Admin UI / Slack webhook for hold approve/reject
- [ ] Auth on `/api/checkout` and admin routes
- [ ] Deliver V2 guide files (secure download after `checkout.session.completed`)
- [ ] Newsletter provider (e.g. Buttondown/Resend) on V3 entitlement
- [ ] One-trial / coupon abuse rules (spec items 13–14) when trials launch

## License

UNLICENSED / private — Asonta / Arry.

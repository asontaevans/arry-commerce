# Arry Commerce — Fraud Policy

Applies to **all** Stripe payment methods: Checkout, Payment Links, Subscriptions, Apple Pay, Google Pay, Link, card, SEPA, and future methods.

## Principles

1. **Server-side entitlements only** — Discord `@Premium` is granted only after verified Stripe webhooks (`checkout.session.completed`, `invoice.paid`, `customer.subscription.updated`). Never trust client redirects, query params, or “I paid” claims.
2. **Signature verification** — Reject any webhook without a valid `Stripe-Signature`.
3. **Idempotency** — Store `event.id`; duplicate deliveries are ignored.
4. **Velocity limits** (rolling 24h, configurable via env):
   - Max checkouts per email
   - Max per Discord user ID
   - Max per IP
   - Max per card fingerprint
5. **Shared card fingerprint** across multiple Discord accounts → **hold** grant + admin review queue (do not auto-grant).
6. **Prepaid cards** — Optionally block for subscriptions (`BLOCK_PREPAID_FOR_SUBSCRIPTIONS`).
7. **Disputes** — On `charge.dispute.created`: immediate revoke, freeze, evidence pack in audit log, **30-day cool-down** on email + Discord ID.
8. **Failed payment / cancel** — On `invoice.payment_failed` or `customer.subscription.deleted`: revoke within minutes.
9. **Radar (Dashboard)** — Enable block high-risk + 3DS for elevated risk when live keys are wired (operational TODO).
10. **Audit log** — Every decision records payment_id, customer_id, discord_id, decision, reason, timestamp.

## Hard content rule

Customer-facing product copy, emails, and Discord content must **never** expose trading account balances or NAV.

## Admin review

Holds appear at `GET /api/admin/holds`. Approve/reject is a live TODO (manual for V1 stub).

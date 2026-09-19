# Privacy Policy — Arry Alerts

**Effective date:** September 20, 2026  
**Operator:** Arry Alerts (“Arry,” “we,” “us,” or “our”)  
**Contact:** privacy@arry-alerts.example *(replace with your real contact email)*

This Privacy Policy explains what information we collect, how we use it, and your choices when you use the Arry Alerts Discord community, website, and paid Services.

## 1. Scope

This Policy covers:

- Our public website (including landing, start-here, and legal pages)
- Checkout and subscription flows powered by Stripe
- Discord community participation and Premium role management
- Related support communications

It does not cover Discord’s own processing as a separate platform, or Stripe’s processing as an independent payment provider—those are governed by their respective privacy policies.

## 2. Information we collect

### 2.1 Information you provide

- **Email address** — typically collected via Stripe Checkout or when you contact us
- **Discord user ID** (and optionally Discord username) — when you link membership for Premium role grant
- **Support messages** — content you send to us by email or Discord DM/tickets
- **Purchase selections** — product or plan chosen at checkout

### 2.2 Information from payments (via Stripe)

We do **not** store full card numbers on our servers. Stripe processes payments and may provide us with:

- Customer ID, payment/subscription IDs
- Billing email and limited billing details
- Payment status, dispute/chargeback events
- Limited fraud signals (for example, card fingerprint identifiers provided by Stripe for risk controls—not the raw PAN)

See Stripe’s privacy documentation for how Stripe handles payment data.

### 2.3 Technical and security data

- **IP address** and approximate location derived from IP (fraud / velocity controls)
- Browser user-agent and basic request metadata on our website
- Webhook delivery metadata from Stripe
- Audit logs of entitlement decisions (grant, hold, revoke) tied to Discord ID / email

### 2.4 Discord

When you join or use our Discord server, Discord processes your Discord account data under Discord’s Privacy Policy. We may see your Discord ID, nickname, roles, and messages in channels we moderate. We use Discord ID to grant or revoke the Premium role after verified payment.

### 2.5 What we do not collect for content

We do **not** require or publish your brokerage **account balances**, **NAV**, or portfolio equity as a condition of membership. Do not send sensitive brokerage credentials to us.

## 3. How we use information

We use personal data to:

- Provide and improve the Services (community access, Premium roles, digital delivery, newsletter)
- Process payments and prevent fraud, abuse, and chargebacks
- Enforce Terms of Service and Discord server rules
- Communicate about purchases, renewals, policy updates, and support
- Comply with law and respond to lawful requests
- Maintain security audit logs and an admin review queue for risky payments

**Legal bases** (where GDPR/UK GDPR apply) typically include: contract performance (providing paid access), legitimate interests (security, fraud prevention, community safety), and consent where required for optional marketing emails.

## 4. Fraud prevention and automated decisions

To protect members and our business, we apply server-side fraud controls on payment events, including velocity limits by email, Discord ID, IP, and payment-method fingerprint, and cool-downs after disputes. Ambiguous risk may place a grant on **hold** for manual review. These measures are security controls, not creditworthiness scoring for consumer lending.

## 5. Payment processor — Stripe

**Stripe** is our payment processor. When you pay, you provide payment details directly to Stripe (or Stripe-powered fields). Stripe may process data in the United States and other countries. Review:

- https://stripe.com/privacy

We configure Stripe Radar and related risk tools where available. Entitlements are updated only after verified Stripe webhooks with signature validation.

## 6. Sharing of information

We share data only as needed with:

- **Stripe** — payments, billing, disputes
- **Discord** — role assignment via bot using Discord ID (no card data sent to Discord)
- **Service providers** — hosting, email/newsletter delivery, error monitoring (when enabled), under contractual safeguards
- **Authorities** — when required by law or to protect rights, safety, and fraud prevention

We do **not** sell your personal information.

## 7. Retention

We retain:

- Purchase and entitlement records for as long as your account relationship lasts and thereafter as needed for bookkeeping, disputes, tax, and fraud prevention (often several years)
- Audit logs related to grants/revokes/disputes for security and chargeback defense
- Support correspondence for a reasonable period to resolve issues
- Cool-down markers after disputes for approximately **30 days** (or longer if needed for ongoing investigation)

When retention is no longer necessary, we delete or anonymize data where feasible.

## 8. Security

We use industry-standard practices appropriate to a small commerce service, including:

- TLS for website and API traffic in production
- Secrets stored in environment variables (not in client code)
- Stripe webhook **signature verification**
- Server-side entitlement checks (clients cannot self-assert “paid”)
- Least-privilege Discord bot permissions for role grant/revoke

No method of transmission or storage is 100% secure; please use strong Discord credentials and enable 2FA.

## 9. International transfers

If you access the Services from outside the country where we operate, your data may be processed in the United States or other locations where our providers (including Stripe and hosting) operate. Where required, we rely on appropriate transfer mechanisms.

## 10. Your rights and choices

Depending on your location, you may have rights to access, correct, delete, or export personal data, object to certain processing, or restrict processing. To exercise rights, email **privacy@arry-alerts.example** with your Discord ID and the email used at checkout.

You may:

- Leave the Discord server at any time
- Cancel a subscription through the billing portal or by contacting us
- Opt out of optional marketing emails via unsubscribe links (transactional billing messages may still be sent)

We may need to verify your identity before fulfilling requests. Some records must be retained for legal or fraud reasons.

## 11. Children

The Services are for users **18+**. We do not knowingly collect personal information from children. If you believe a minor has provided data, contact us and we will take appropriate steps.

## 12. Do Not Track / cookies

Our marketing site is primarily static. If we later add analytics cookies, we will update this Policy and provide notices/consents as required. Essential cookies or local storage may be used for checkout UX.

## 13. Changes to this Policy

We may update this Privacy Policy by posting a new version with a revised effective date. Material changes will be highlighted on the website where practical.

## 14. Contact

Privacy questions or requests: **privacy@arry-alerts.example**  
Legal / Terms: **legal@arry-alerts.example**  
Discord: https://discord.gg/svQZGsxJtD

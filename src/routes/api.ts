import { Router, type Request, type Response } from 'express';
import { catalogForApi, getProductById, selectAlertsProduct } from '../catalog/products';
import { config } from '../config';
import { getEntitlementStatus } from '../entitlements/service';
import { FRAUD_POLICY } from '../fraud';
import { store } from '../store/memoryStore';
import { getStripe } from '../stripe/client';
import { resolveStripePriceId } from '../catalog/products';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'arry-commerce',
    env: config.nodeEnv,
    stripeConfigured: !config.stripe.secretKey.includes('REPLACE_ME'),
    discordConfigured: Boolean(config.discord.botToken),
  });
});

apiRouter.get('/catalog', (_req, res) => {
  res.json(catalogForApi(store.activePremiumCount));
});

apiRouter.get('/fraud/policy', (_req, res) => {
  res.json({
    version: FRAUD_POLICY.version,
    windowHours: FRAUD_POLICY.windowHours,
    velocity: {
      maxPerEmail: FRAUD_POLICY.velocity.maxPerEmail(),
      maxPerDiscord: FRAUD_POLICY.velocity.maxPerDiscord(),
      maxPerIp: FRAUD_POLICY.velocity.maxPerIp(),
      maxPerCardFingerprint: FRAUD_POLICY.velocity.maxPerCardFingerprint(),
    },
    disputeCooldownDays: FRAUD_POLICY.disputeCooldownDays(),
    blockPrepaidForSubscriptions: FRAUD_POLICY.blockPrepaidForSubscriptions(),
    grantEvents: FRAUD_POLICY.grantEvents,
    revokeEvents: FRAUD_POLICY.revokeEvents,
    note: 'Entitlements are server-side only; never trust client payment claims.',
  });
});

apiRouter.get('/entitlements/:discordId', (req, res) => {
  const status = getEntitlementStatus(req.params.discordId);
  res.json(status);
});

apiRouter.get('/admin/holds', (_req, res) => {
  res.json({ holds: store.listPendingHolds() });
});

apiRouter.get('/admin/audit', (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200);
  res.json({ entries: store.auditLog.slice(-limit).reverse() });
});

/**
 * Create Checkout Session (server-side). Client must not invent price IDs.
 * TODO(live): require auth / CSRF for production storefront.
 */
apiRouter.post('/checkout', async (req: Request, res: Response) => {
  try {
    const {
      productId,
      email,
      discordId,
      successUrl,
      cancelUrl,
    } = req.body as {
      productId?: string;
      email?: string;
      discordId?: string;
      successUrl?: string;
      cancelUrl?: string;
    };

    let product = productId ? getProductById(productId) : undefined;
    if (!product && (!productId || productId === 'alerts-premium')) {
      product = selectAlertsProduct(store.activePremiumCount);
    }
    if (!product) {
      res.status(400).json({ error: 'unknown_product' });
      return;
    }

    if (config.stripe.secretKey.includes('REPLACE_ME')) {
      res.status(503).json({
        error: 'stripe_not_configured',
        message:
          'Set STRIPE_SECRET_KEY and Price IDs in .env (see .env.example). Returning catalog stub.',
        stubCheckout: {
          productId: product.id,
          priceId: resolveStripePriceId(product),
          mode: product.kind === 'subscription' ? 'subscription' : 'payment',
          email,
          discordId,
        },
      });
      return;
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: product.kind === 'subscription' ? 'subscription' : 'payment',
      line_items: [{ price: resolveStripePriceId(product), quantity: 1 }],
      customer_email: email,
      success_url:
        successUrl ||
        `${config.baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${config.baseUrl}/cancel.html`,
      metadata: {
        product_id: product.id,
        discord_id: discordId || '',
        email: email || '',
      },
      subscription_data:
        product.kind === 'subscription'
          ? {
              metadata: {
                product_id: product.id,
                discord_id: discordId || '',
                email: email || '',
              },
            }
          : undefined,
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'checkout_failed';
    res.status(500).json({ error: 'checkout_failed', message });
  }
});

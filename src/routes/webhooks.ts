import { Router, type Request, type Response } from 'express';
import {
  WebhookSignatureError,
  constructEvent,
  handleStripeEvent,
} from '../stripe/webhookHandler';

export const webhooksRouter = Router();

/**
 * POST /api/webhooks/stripe
 * Requires raw body (configured in app). Verifies Stripe-Signature.
 */
webhooksRouter.post(
  '/stripe',
  async (req: Request, res: Response): Promise<void> => {
    const signature = req.headers['stripe-signature'];
    const sig = Array.isArray(signature) ? signature[0] : signature;

    let event;
    try {
      const raw =
        (req as Request & { rawBody?: Buffer }).rawBody ??
        (Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body)));
      event = constructEvent(raw, sig);
    } catch (err) {
      if (err instanceof WebhookSignatureError) {
        res.status(400).json({ error: 'invalid_signature', message: err.message });
        return;
      }
      res.status(400).json({ error: 'webhook_error' });
      return;
    }

    try {
      const result = await handleStripeEvent(event);
      res.status(200).json({ received: true, ...result });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'handler_failed';
      res.status(500).json({ error: 'handler_failed', message });
    }
  }
);

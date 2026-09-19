import Stripe from 'stripe';
import { config } from '../config';

let stripeSingleton: Stripe | null = null;

/**
 * Lazy Stripe client. Uses placeholder key in tests; live key via env later.
 */
export function getStripe(): Stripe {
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(config.stripe.secretKey, {
      apiVersion: '2024-06-20',
      typescript: true,
    });
  }
  return stripeSingleton;
}

/** Reset for tests. */
export function resetStripeClient(): void {
  stripeSingleton = null;
}

import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  console.warn('Warning: STRIPE_SECRET_KEY is not set. Stripe features will be unavailable.');
}

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2024-04-10',
      typescript: true,
    })
  : null;

export const STRIPE_PRICE_IDS = {
  STARTER: process.env.STRIPE_PRICE_STARTER ?? '',
  GROWTH: process.env.STRIPE_PRICE_GROWTH ?? '',
  PRO: process.env.STRIPE_PRICE_PRO ?? '',
};

export default stripe;

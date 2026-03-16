#!/usr/bin/env node
// Run with: railway run node scripts/seed-coupons.js
// Or locally: STRIPE_SECRET_KEY=sk_live_... node scripts/seed-coupons.js

const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

async function main() {
  console.log('Creating TEST coupon (100% off)...');

  // Check if coupon already exists
  try {
    const existing = await stripe.promotionCodes.list({ code: 'TEST', limit: 1 });
    if (existing.data.length > 0) {
      console.log('Promo code TEST already exists:', existing.data[0].id);
      return;
    }
  } catch (e) {}

  // Create the coupon
  const coupon = await stripe.coupons.create({
    name: 'Test - 100% Off',
    percent_off: 100,
    duration: 'once',
  });
  console.log('Coupon created:', coupon.id);

  // Create the promotion code TEST
  const promo = await stripe.promotionCodes.create({
    coupon: coupon.id,
    code: 'TEST',
  });
  console.log('Promo code created:', promo.code, '(' + promo.id + ')');
  console.log('Done! Users can now enter TEST at checkout for 100% off.');
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});

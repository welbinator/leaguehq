#!/usr/bin/env node
// Creates LeagueHQ products, prices, and the TEST coupon in Stripe.
// Run with: railway run node scripts/seed-stripe.js

const Stripe = require('stripe');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

const TIERS = [
  { key: 'STARTER', name: 'LeagueHQ Starter', price: 29, description: 'Up to 100 players, schedule management, basic standings' },
  { key: 'GROWTH',  name: 'LeagueHQ Growth',  price: 79, description: 'Up to 500 players, online payments, messaging, referee management' },
  { key: 'PRO',     name: 'LeagueHQ Pro',      price: 149, description: 'Unlimited players, custom branding, advanced analytics, API access' },
];

async function main() {
  console.log('=== LeagueHQ Stripe Seed ===\n');

  const envLines = [];

  for (const tier of TIERS) {
    console.log(`Processing ${tier.name}...`);

    // Find or create product
    const existing = await stripe.products.search({ query: `name:"${tier.name}"` });
    let product;
    if (existing.data.length > 0) {
      product = existing.data[0];
      console.log(`  Product exists: ${product.id}`);
    } else {
      product = await stripe.products.create({
        name: tier.name,
        description: tier.description,
        metadata: { tier: tier.key },
      });
      console.log(`  Product created: ${product.id}`);
    }

    // Find or create monthly recurring price
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 10 });
    const existingPrice = prices.data.find(p =>
      p.recurring?.interval === 'month' && p.unit_amount === tier.price * 100
    );

    let price;
    if (existingPrice) {
      price = existingPrice;
      console.log(`  Price exists: ${price.id} ($${tier.price}/mo)`);
    } else {
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: tier.price * 100,
        currency: 'usd',
        recurring: { interval: 'month' },
        metadata: { tier: tier.key },
      });
      console.log(`  Price created: ${price.id} ($${tier.price}/mo)`);
    }

    envLines.push(`STRIPE_PRICE_${tier.key}=${price.id}`);
  }

  // Create TEST coupon (100% off, one-time use)
  console.log('\nProcessing TEST coupon...');
  const existingPromos = await stripe.promotionCodes.list({ code: 'TEST', limit: 1 });
  if (existingPromos.data.length > 0) {
    console.log(`  Promo code TEST already exists: ${existingPromos.data[0].id}`);
  } else {
    const coupon = await stripe.coupons.create({
      name: 'Test - 100% Off',
      percent_off: 100,
      duration: 'once',
    });
    const promo = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: 'TEST',
    });
    console.log(`  Coupon created: ${coupon.id}`);
    console.log(`  Promo code created: ${promo.code}`);
  }

  console.log('\n=== Done! Add these to Railway env vars ===');
  envLines.forEach(l => console.log(l));
  console.log('\nUsers can enter TEST at checkout for 100% off.');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});

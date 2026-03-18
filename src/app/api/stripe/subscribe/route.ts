import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// Price IDs — set these as env vars once you create products in Stripe dashboard
// STRIPE_PRICE_STARTER, STRIPE_PRICE_GROWTH, STRIPE_PRICE_PRO
const PRICE_IDS: Record<string, string | undefined> = {
  STARTER: process.env.STRIPE_PRICE_STARTER,
  GROWTH: process.env.STRIPE_PRICE_GROWTH,
  PRO: process.env.STRIPE_PRICE_PRO,
};

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { tier } = await req.json();
  if (!tier || !PRICE_IDS[tier]) {
    return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
  }

  const priceId = PRICE_IDS[tier];
  if (!priceId) {
    return NextResponse.json({ error: `Price not configured for ${tier} plan. Set STRIPE_PRICE_${tier} env var.` }, { status: 500 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' });
  const appUrl = process.env.NEXTAUTH_URL ?? 'https://leaguehq.club';
  const userId = (session.user as any).id;
  const userEmail = session.user.email!;

  // Get or create Stripe customer
  let user = await prisma.user.findUnique({ where: { id: userId }, select: { stripeCustomerId: true } });
  let customerId = user?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({ email: userEmail, metadata: { userId } });
    customerId = customer.id;
    await prisma.user.update({ where: { id: userId }, data: { stripeCustomerId: customerId } });
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/dashboard?subscribed=1&tier=${tier}`,
    cancel_url: `${appUrl}/pricing`,
    metadata: { userId, tier },
  });

  return NextResponse.json({ url: checkoutSession.url });
}

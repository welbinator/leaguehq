import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// POST /api/stripe/activate-subscription
// Called when user lands on /dashboard?subscribed=1 after Stripe Checkout.
// Verifies the subscription is actually paid before activating.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const { tier } = await req.json();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' });

  // Find the user's Stripe customer and check for active subscription
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { stripeCustomerId: true, subscriptionStatus: true },
  });

  if (!user?.stripeCustomerId) {
    return NextResponse.json({ error: 'No Stripe customer found' }, { status: 400 });
  }

  // Fetch subscriptions from Stripe to verify
  const subscriptions = await stripe.subscriptions.list({
    customer: user.stripeCustomerId,
    status: 'active',
    limit: 1,
  });

  if (subscriptions.data.length === 0) {
    return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
  }

  const sub = subscriptions.data[0];

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionTier: tier ?? 'STARTER',
      subscriptionStatus: 'ACTIVE',
      stripeSubscriptionId: sub.id,
    },
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' });

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    console.error('[webhook] signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  // Subscription activated
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode === 'subscription' && session.metadata?.userId) {
      const tier = session.metadata.tier ?? 'STARTER';
      await prisma.user.update({
        where: { id: session.metadata.userId },
        data: {
          subscriptionTier: tier,
          subscriptionStatus: 'ACTIVE',
          stripeSubscriptionId: typeof session.subscription === 'string' ? session.subscription : null,
        },
      });
      console.log(`[webhook] User ${session.metadata.userId} subscribed to ${tier}`);
      return NextResponse.json({ received: true });
    }
  }

  // Subscription updated/renewed
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: sub.id } });
    if (user) {
      const status = sub.status === 'active' ? 'ACTIVE' : sub.status === 'past_due' ? 'PAST_DUE' : 'INACTIVE';
      await prisma.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: status },
      });
    }
    return NextResponse.json({ received: true });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const registrationId = session.metadata?.registrationId;
    if (!registrationId) return NextResponse.json({ received: true });

    const amountTotal = session.amount_total ?? 0;
    const amountDollars = amountTotal / 100;

    await prisma.teamRegistration.update({
      where: { id: registrationId },
      data: {
        paymentStatus: 'paid',
        paymentAmount: amountDollars,
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : null,
        paidAt: new Date(),
        status: 'APPROVED', // auto-approve on payment
      },
    });

    console.log(`[webhook] Registration ${registrationId} paid $${amountDollars}`);
  }

  return NextResponse.json({ received: true });
}

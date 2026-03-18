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

  // ──────────────────────────────────────────────
  // Checkout session completed
  // Could be a subscription checkout OR a registration payment — check metadata to distinguish
  // ──────────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Subscription checkout (platform plan purchase)
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
    }

    // League registration payment
    const registrationId = session.metadata?.registrationId;
    if (registrationId) {
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
          status: 'APPROVED',
        },
      });
      console.log(`[webhook] Registration ${registrationId} paid $${amountDollars}`);
    }

    return NextResponse.json({ received: true });
  }

  // ──────────────────────────────────────────────
  // Subscription updated or cancelled
  // Fired when: plan changes, cancellation, end of billing period, etc.
  // ──────────────────────────────────────────────
  if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription;
    const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: sub.id } });

    if (user) {
      let status: string;
      if (sub.status === 'active') {
        status = 'ACTIVE';
      } else if (sub.status === 'past_due') {
        status = 'PAST_DUE';
      } else {
        // canceled, unpaid, incomplete_expired, etc.
        status = 'INACTIVE';
      }

      await prisma.user.update({
        where: { id: user.id },
        data: { subscriptionStatus: status },
      });
      console.log(`[webhook] User ${user.id} subscription ${sub.id} → ${status} (stripe: ${sub.status})`);
    }

    return NextResponse.json({ received: true });
  }

  // ──────────────────────────────────────────────
  // Payment failed (e.g. card declined on renewal)
  // Mark user PAST_DUE immediately so the dashboard reflects it
  // Stripe will retry and eventually cancel → triggers subscription.updated above
  // ──────────────────────────────────────────────
  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object as Stripe.Invoice;
    const subId = typeof invoice.subscription === 'string' ? invoice.subscription : null;

    if (subId) {
      const user = await prisma.user.findFirst({ where: { stripeSubscriptionId: subId } });
      if (user) {
        await prisma.user.update({
          where: { id: user.id },
          data: { subscriptionStatus: 'PAST_DUE' },
        });
        console.log(`[webhook] User ${user.id} payment failed → PAST_DUE`);
      }
    }

    return NextResponse.json({ received: true });
  }

  return NextResponse.json({ received: true });
}

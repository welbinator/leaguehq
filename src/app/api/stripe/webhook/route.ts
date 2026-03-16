import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import stripe from '@/lib/stripe';

// Stripe requires the raw body to verify the webhook signature
export const config = { api: { bodyParser: false } };

const TIER_MAP: Record<string, 'STARTER' | 'GROWTH' | 'PRO'> = {
  [process.env.STRIPE_PRICE_STARTER ?? '']: 'STARTER',
  [process.env.STRIPE_PRICE_GROWTH ?? '']: 'GROWTH',
  [process.env.STRIPE_PRICE_PRO ?? '']: 'PRO',
};

export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

  const sig = req.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing stripe signature or webhook secret' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('[stripe/webhook] signature verification failed:', err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  try {
    switch (event.type) {

      // ── Registration payment completed ────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const { type, registrationId, leagueId } = session.metadata ?? {};

        if (type === 'registration' && registrationId) {
          await prisma.registration.update({
            where: { id: registrationId },
            data: {
              status: 'APPROVED',
              paidAt: new Date(),
              stripePaymentIntentId: session.payment_intent as string ?? null,
            },
          });
          console.log(`[stripe/webhook] Registration ${registrationId} marked as paid`);
        }

        if (type === 'subscription' && leagueId) {
          // Subscription activated via checkout — handled more fully by
          // customer.subscription.created/updated below, but log it here
          console.log(`[stripe/webhook] Subscription checkout completed for league ${leagueId}`);
        }
        break;
      }

      // ── Subscription created or updated ───────────────────────────────────
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const league = await prisma.league.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (!league) {
          console.warn(`[stripe/webhook] No league found for customer ${customerId}`);
          break;
        }

        const priceId = subscription.items.data[0]?.price.id;
        const tier = TIER_MAP[priceId] ?? null;

        const statusMap: Record<string, string> = {
          active: 'ACTIVE',
          trialing: 'TRIALING',
          past_due: 'PAST_DUE',
          canceled: 'CANCELLED',
          unpaid: 'UNPAID',
        };
        const subStatus = statusMap[subscription.status] ?? 'ACTIVE';

        await prisma.league.update({
          where: { id: league.id },
          data: {
            ...(tier ? { subscriptionTier: tier } : {}),
            subscriptionStatus: subStatus as any,
          },
        });
        console.log(`[stripe/webhook] League ${league.id} subscription updated: tier=${tier} status=${subStatus}`);
        break;
      }

      // ── Subscription cancelled ────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        const league = await prisma.league.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (!league) break;

        await prisma.league.update({
          where: { id: league.id },
          data: {
            subscriptionTier: 'FREE',
            subscriptionStatus: 'CANCELLED',
          },
        });
        console.log(`[stripe/webhook] League ${league.id} downgraded to FREE (subscription cancelled)`);
        break;
      }

      // ── Payment failed (subscription past due) ────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        const league = await prisma.league.findFirst({
          where: { stripeCustomerId: customerId },
        });
        if (!league) break;

        await prisma.league.update({
          where: { id: league.id },
          data: { subscriptionStatus: 'PAST_DUE' },
        });
        console.log(`[stripe/webhook] League ${league.id} payment failed — marked PAST_DUE`);
        break;
      }

      default:
        console.log(`[stripe/webhook] Unhandled event type: ${event.type}`);
    }
  } catch (err: any) {
    console.error('[stripe/webhook] handler error:', err);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

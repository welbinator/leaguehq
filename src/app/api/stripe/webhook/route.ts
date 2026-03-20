import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' });

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  // Determine if this is a Connect webhook (from a connected account) or a platform webhook.
  // Connect events include an 'account' property in the raw payload.
  // We try the Connect webhook secret first if available, then fall back to platform secret.
  let event: Stripe.Event;
  const rawPayload = JSON.parse(body);
  const isConnectEvent = !!rawPayload.account;

  if (isConnectEvent && process.env.STRIPE_CONNECT_WEBHOOK_SECRET) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_CONNECT_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error('[webhook] Connect signature verification failed:', err.message);
      return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
    }
  } else if (process.env.STRIPE_WEBHOOK_SECRET) {
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error('[webhook] Platform signature verification failed:', err.message);
      return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
    }
  } else {
    return NextResponse.json({ error: 'No webhook secret configured' }, { status: 400 });
  }

  // ──────────────────────────────────────────────
  // Checkout session completed
  // Could be a platform subscription checkout OR a connected account registration payment
  // ──────────────────────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Platform subscription checkout (director buying a LeagueHQ plan)
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

    // League registration payment (fired from connected account via Connect webhook)
    const registrationId = session.metadata?.registrationId;
    if (registrationId) {
      const amountTotal = session.amount_total ?? 0;
      const amountDollars = amountTotal / 100;
      const paymentIntent = typeof session.payment_intent === 'string' ? session.payment_intent : null;
      const connectedAccountId = (rawPayload.account as string) ?? session.metadata?.leagueStripeAccountId ?? null;

      console.log(`[webhook] Registration payment received — registrationId: ${registrationId}, account: ${connectedAccountId}, amount: $${amountDollars}`);

      // Try SeasonEnrollment first (new flow), then PlayerRegistration, then TeamRegistration (legacy)
      const enrollment = await prisma.seasonEnrollment.findUnique({ where: { id: registrationId } });
      if (enrollment) {
        await prisma.seasonEnrollment.update({
          where: { id: registrationId },
          data: {
            paymentStatus: 'paid',
            paymentAmount: amountDollars,
            stripeCheckoutSessionId: session.id,
            stripePaymentIntentId: paymentIntent,
            paidAt: new Date(),
            status: 'APPROVED',
          },
        });
        await prisma.playerRegistration.updateMany({
          where: { seasonEnrollmentId: registrationId, paymentStatus: 'awaiting_payment' },
          data: { paymentStatus: 'paid', paidAt: new Date() },
        });
        console.log(`[webhook] SeasonEnrollment ${registrationId} paid $${amountDollars}`);
      } else {
        const playerReg = await prisma.playerRegistration.findUnique({ where: { id: registrationId } });
        if (playerReg) {
          await prisma.playerRegistration.update({
            where: { id: registrationId },
            data: {
              paymentStatus: 'paid',
              paymentAmount: amountDollars,
              stripeCheckoutSessionId: session.id,
              stripePaymentIntentId: paymentIntent,
              paidAt: new Date(),
            },
          });
          console.log(`[webhook] PlayerRegistration ${registrationId} paid $${amountDollars}`);
        } else {
          try {
            await prisma.teamRegistration.update({
              where: { id: registrationId },
              data: {
                paymentStatus: 'paid',
                paymentAmount: amountDollars,
                stripeCheckoutSessionId: session.id,
                stripePaymentIntentId: paymentIntent,
                paidAt: new Date(),
                status: 'APPROVED',
              },
            });
            console.log(`[webhook] TeamRegistration ${registrationId} paid $${amountDollars}`);
          } catch (e) {
            console.error(`[webhook] Could not find registration ${registrationId} in any table`, e);
          }
        }
      }
    }

    return NextResponse.json({ received: true });
  }

  // ──────────────────────────────────────────────
  // Subscription updated or cancelled (platform events only)
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
  // Payment failed on subscription renewal
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

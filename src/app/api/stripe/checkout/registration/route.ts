import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// POST /api/stripe/checkout/registration
// Creates a Stripe Checkout session using on_behalf_of + transfer_data.
// This means:
// - The charge appears in the DIRECTOR's Stripe dashboard as their own payment
// - The customer sees the director's business name on their statement
// - Funds land directly in the director's account
// - Platform collects application_fee_amount automatically
export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

  const { registrationId, registrationType } = await req.json();
  const isPlayer = registrationType === 'player';
  const appUrl = process.env.NEXTAUTH_URL ?? 'https://leaguehq.club';

  let registration: any;
  if (isPlayer) {
    registration = await prisma.playerRegistration.findUnique({
      where: { id: registrationId },
      include: {
        season: {
          include: {
            league: { select: { id: true, name: true, slug: true, stripeConnectAccountId: true } },
            seasonDivisions: true,
          },
        },
        seasonDivision: true,
      },
    });
  } else {
    registration = await prisma.teamRegistration.findUnique({
      where: { id: registrationId },
      include: {
        season: {
          include: {
            league: { select: { id: true, name: true, slug: true, stripeConnectAccountId: true } },
            seasonDivisions: true,
          },
        },
        seasonDivision: true,
      },
    });
  }

  if (!registration) return NextResponse.json({ error: 'Registration not found' }, { status: 404 });

  const league = registration.season.league;
  if (!league.stripeConnectAccountId) {
    return NextResponse.json({ error: 'League does not have Stripe connected' }, { status: 400 });
  }

  const sd = registration.seasonDivision ?? registration.season.seasonDivisions?.[0];
  const priceAmount = sd ? parseFloat(String(sd.price)) || 0 : 0;
  const pricingType = sd?.pricingType ?? 'PER_PLAYER';

  if (priceAmount <= 0) {
    return NextResponse.json({ error: 'No charge amount configured for this season' }, { status: 400 });
  }

  const amountCents = Math.round(priceAmount * 100);
  const platformFeeCents = Math.round(amountCents * 0.025); // 2.5% platform fee

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

  // on_behalf_of: charge appears in the director's Stripe dashboard as their own payment.
  // transfer_data.destination: funds go directly to the director's account.
  // application_fee_amount: platform collects 2.5% from each transaction.
  // Session is created on the platform account (no stripeAccount header) so we
  // can use our own API key and webhook — but the director owns the charge.
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: amountCents,
        product_data: {
          name: `${league.name} — ${registration.season.name} Registration`,
          description: `${pricingType === 'PER_PLAYER' ? 'Per player' : 'Per team'} · Team: ${registration.teamName ?? 'Player registration'}`,
        },
      },
      quantity: 1,
    }],
    payment_intent_data: {
      on_behalf_of: league.stripeConnectAccountId,
      transfer_data: {
        destination: league.stripeConnectAccountId,
      },
      application_fee_amount: platformFeeCents,
    },
    success_url: `${appUrl}/register/${league.slug}/${registration.seasonId}?payment=success&reg=${registrationId}`,
    cancel_url: `${appUrl}/register/${league.slug}/${registration.seasonId}?payment=cancelled`,
    metadata: { registrationId, leagueId: league.id, seasonId: registration.seasonId },
  });

  return NextResponse.json({ url: session.url });
}

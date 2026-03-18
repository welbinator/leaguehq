import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// POST /api/stripe/checkout/registration
// Creates a Stripe Checkout session using a destination charge:
// - Charge is created on the PLATFORM account
// - Full amount is transferred to the league director's connected account
// - Platform takes a 2.5% application fee from that transfer
// This is the correct pattern for Standard Connect accounts.
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

  // Destination charge: session is created on the PLATFORM account (no stripeAccount header).
  // transfer_data.destination routes the funds to the director's connected account.
  // application_fee_amount is deducted from the transfer — platform keeps that portion.
  // Result: director sees the full charge in their Stripe dashboard; platform gets the fee.
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
      // Route funds to the league director's Stripe account
      transfer_data: {
        destination: league.stripeConnectAccountId,
      },
      // Platform fee deducted before transfer
      application_fee_amount: platformFeeCents,
    },
    success_url: `${appUrl}/register/${league.slug}/${registration.seasonId}?payment=success&reg=${registrationId}`,
    cancel_url: `${appUrl}/register/${league.slug}/${registration.seasonId}?payment=cancelled`,
    metadata: { registrationId, leagueId: league.id, seasonId: registration.seasonId },
  });
  // Note: NO stripeAccount option here — session runs on the platform account intentionally.

  return NextResponse.json({ url: session.url });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// POST /api/stripe/checkout/registration
// Public — no auth required. Creates a Checkout session after registration form submission.
// Payment goes to the league director's connected account minus a 2.5% platform fee.
export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

  const { registrationId } = await req.json();
  const appUrl = process.env.NEXTAUTH_URL ?? 'https://leaguehq.club';

  const registration = await prisma.teamRegistration.findUnique({
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

  if (!registration) return NextResponse.json({ error: 'Registration not found' }, { status: 404 });

  const league = registration.season.league;
  if (!league.stripeConnectAccountId) {
    return NextResponse.json({ error: 'League does not have Stripe connected' }, { status: 400 });
  }

  // Get price from selected division or first available division
  const sd = registration.seasonDivision ?? registration.season.seasonDivisions?.[0];
  const priceAmount = sd ? parseFloat(String(sd.price)) || 0 : 0;
  const pricingType = sd?.pricingType ?? 'PER_PLAYER';

  if (priceAmount <= 0) {
    return NextResponse.json({ error: 'No charge amount configured for this season' }, { status: 400 });
  }

  const amountCents = Math.round(priceAmount * 100);
  const platformFeeCents = Math.round(amountCents * 0.025); // 2.5% platform fee

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: amountCents,
        product_data: {
          name: `${league.name} — ${registration.season.name} Registration`,
          description: `${pricingType === 'PER_PLAYER' ? 'Per player' : 'Per team'} · Team: ${registration.teamName}`,
        },
      },
      quantity: 1,
    }],
    payment_intent_data: {
      application_fee_amount: platformFeeCents,
      transfer_data: { destination: league.stripeConnectAccountId },
    },
    success_url: `${appUrl}/register/${league.slug}/${registration.seasonId}?payment=success&reg=${registrationId}`,
    cancel_url: `${appUrl}/register/${league.slug}/${registration.seasonId}?payment=cancelled`,
    metadata: { registrationId, leagueId: league.id, seasonId: registration.seasonId },
  });

  return NextResponse.json({ url: session.url });
}

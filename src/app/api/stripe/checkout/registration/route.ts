import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// POST /api/stripe/checkout/registration
// Supports both new (SeasonEnrollment) and legacy (TeamRegistration) flows.
export async function POST(req: NextRequest) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

  const { registrationId, registrationType } = await req.json();
  const appUrl = process.env.NEXTAUTH_URL ?? 'https://leaguehq.club';

  let leagueSlug: string;
  let seasonId: string;
  let leagueStripeAccountId: string | null;
  let priceAmount: number;
  let pricingType: string;
  let teamName: string;
  let seasonName: string;
  let leagueName: string;
  let playerEmail: string | null = null;

  // Try SeasonEnrollment first (new flow)
  const enrollment = await prisma.seasonEnrollment.findUnique({
    where: { id: registrationId },
    include: {
      team: { select: { name: true } },
      season: {
        include: {
          league: { select: { id: true, name: true, slug: true, stripeConnectAccountId: true } },
          seasonDivisions: true,
        },
      },
      seasonDivision: true,
      playerRegistrations: {
        where: { isCaptain: true },
        select: { playerEmail: true },
        take: 1,
      },
    },
  });

  if (enrollment) {
    const league = enrollment.season.league;
    if (!league.stripeConnectAccountId) {
      return NextResponse.json({ error: 'League does not have Stripe connected' }, { status: 400 });
    }
    const sd = enrollment.seasonDivision ?? enrollment.season.seasonDivisions?.[0];
    priceAmount = sd ? parseFloat(String(sd.price)) || 0 : 0;
    pricingType = sd?.pricingType ?? 'PER_PLAYER';
    if (priceAmount <= 0) return NextResponse.json({ error: 'No charge amount configured for this season' }, { status: 400 });
    leagueSlug = league.slug;
    seasonId = enrollment.seasonId;
    leagueStripeAccountId = league.stripeConnectAccountId;
    teamName = enrollment.team.name;
    seasonName = enrollment.season.name;
    leagueName = league.name;
    playerEmail = enrollment.playerRegistrations?.[0]?.playerEmail ?? null;
  } else {
    // Legacy: try TeamRegistration
    const isPlayer = registrationType === 'player';
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
    if (!league.stripeConnectAccountId) return NextResponse.json({ error: 'League does not have Stripe connected' }, { status: 400 });
    const sd = registration.seasonDivision ?? registration.season.seasonDivisions?.[0];
    priceAmount = sd ? parseFloat(String(sd.price)) || 0 : 0;
    pricingType = sd?.pricingType ?? 'PER_PLAYER';
    if (priceAmount <= 0) return NextResponse.json({ error: 'No charge amount configured for this season' }, { status: 400 });
    leagueSlug = league.slug;
    seasonId = registration.seasonId;
    leagueStripeAccountId = league.stripeConnectAccountId;
    teamName = registration.teamName ?? 'Player registration';
    playerEmail = registration.playerEmail ?? null;
    seasonName = registration.season.name;
    leagueName = league.name;
  }

  const amountCents = Math.round(priceAmount * 100);
  const platformFeeCents = Math.round(amountCents * 0.025);
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

  // Create or retrieve a customer on the connected account so Stripe associates the payment with a customer
  let connectedCustomerId: string | undefined;
  if (playerEmail && leagueStripeAccountId) {
    try {
      // Search for existing customer on the connected account first
      const existing = await stripe.customers.list(
        { email: playerEmail, limit: 1 },
        { stripeAccount: leagueStripeAccountId }
      );
      if (existing.data.length > 0) {
        connectedCustomerId = existing.data[0].id;
      } else {
        const created = await stripe.customers.create(
          { email: playerEmail, metadata: { leagueHQRegistrationId: registrationId } },
          { stripeAccount: leagueStripeAccountId }
        );
        connectedCustomerId = created.id;
      }
    } catch (e) {
      console.error('[checkout] Failed to create/find customer on connected account:', e);
      // Non-fatal — proceed without customer
    }
  }

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: 'payment',
    line_items: [{
      price_data: {
        currency: 'usd',
        unit_amount: amountCents,
        product_data: {
          name: `${leagueName} — ${seasonName} Registration`,
          description: `${pricingType === 'PER_PLAYER' ? 'Per player' : 'Per team'} · Team: ${teamName}`,
        },
      },
      quantity: 1,
    }],
    payment_intent_data: {
      on_behalf_of: leagueStripeAccountId!,
      transfer_data: { destination: leagueStripeAccountId! },
      application_fee_amount: platformFeeCents,
    },
    success_url: `${appUrl}/register/${leagueSlug}/${seasonId}?payment=success&reg=${registrationId}`,
    cancel_url: `${appUrl}/register/${leagueSlug}/${seasonId}?payment=cancelled`,
    metadata: { registrationId, leagueSlug, seasonId },
    ...(connectedCustomerId
      ? { customer: connectedCustomerId }
      : playerEmail ? { customer_email: playerEmail } : {}),
  };
  const session = await stripe.checkout.sessions.create(sessionParams);

  return NextResponse.json({ url: session.url });
}

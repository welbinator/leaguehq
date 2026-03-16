import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import stripe from '@/lib/stripe';

// POST /api/stripe/checkout
// Body: { type: 'subscription' | 'registration', priceId?, leagueId, registrationId? }
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });
  }

  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id as string;
  const body = await req.json();
  const { type, priceId, leagueId, registrationId } = body;

  const origin = req.headers.get('origin') || process.env.NEXTAUTH_URL || 'http://localhost:3000';

  try {
    if (type === 'subscription') {
      if (!priceId || !leagueId) {
        return NextResponse.json({ error: 'priceId and leagueId are required' }, { status: 400 });
      }

      const league = await prisma.league.findUnique({ where: { id: leagueId } });
      if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 });
      if (league.ownerId !== userId) {
        return NextResponse.json({ error: 'Only the league owner can manage subscriptions' }, { status: 403 });
      }

      let customerId = league.stripeCustomerId;
      if (!customerId) {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const customer = await stripe.customers.create({
          email: user?.email,
          name: user?.name ?? undefined,
          metadata: { leagueId, userId },
        });
        customerId = customer.id;
        await prisma.league.update({
          where: { id: leagueId },
          data: { stripeCustomerId: customerId },
        });
      }

      const checkoutSession = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${origin}/dashboard?subscription=success`,
        cancel_url: `${origin}/dashboard?subscription=cancelled`,
        metadata: { leagueId, userId, type: 'subscription' },
        allow_promotion_codes: true,
      });

      return NextResponse.json({ url: checkoutSession.url });
    }

    if (type === 'registration') {
      if (!registrationId) {
        return NextResponse.json({ error: 'registrationId is required' }, { status: 400 });
      }

      const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: { season: true, league: true },
      });

      if (!registration) return NextResponse.json({ error: 'Registration not found' }, { status: 404 });
      if (registration.userId !== userId) {
        return NextResponse.json({ error: 'You can only pay for your own registration' }, { status: 403 });
      }
      if (registration.paidAt) {
        return NextResponse.json({ error: 'Registration already paid' }, { status: 400 });
      }

      const amountCents = Math.round(Number(registration.amount) * 100);
      if (amountCents <= 0) {
        return NextResponse.json({ error: 'Invalid registration amount' }, { status: 400 });
      }

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: 'payment',
        line_items: [
          {
            price_data: {
              currency: 'usd',
              unit_amount: amountCents,
              product_data: {
                name: `${registration.league.name} - ${registration.season.name} Registration`,
              },
            },
            quantity: 1,
          },
        ],
        success_url: `${origin}/leagues/${registration.league.id}?payment=success`,
        cancel_url: `${origin}/leagues/${registration.league.id}?payment=cancelled`,
        allow_promotion_codes: true,
        metadata: {
          registrationId,
          userId,
          leagueId: registration.leagueId,
          type: 'registration',
        },
      });

      return NextResponse.json({ url: checkoutSession.url });
    }

    return NextResponse.json({ error: 'Invalid checkout type' }, { status: 400 });
  } catch (err: any) {
    console.error('[stripe/checkout] error:', err);
    return NextResponse.json({ error: err.message ?? 'Stripe error' }, { status: 500 });
  }
}

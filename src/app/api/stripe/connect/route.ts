import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// POST /api/stripe/connect { leagueId }
// Creates a Standard connected account and returns an Account Link URL.
// Standard accounts let directors log in with their existing Stripe account.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { leagueId } = await req.json();
  const appUrl = process.env.NEXTAUTH_URL ?? 'https://leaguehq.club';

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured on this server' }, { status: 500 });
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, ownerId: true, slug: true, stripeConnectAccountId: true },
  });

  if (!league || league.ownerId !== (session.user as any).id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-04-10' });

    let accountId = league.stripeConnectAccountId;

    // Create a Standard account if we don't have one yet
    if (!accountId) {
      const account = await stripe.accounts.create({ type: 'standard' });
      accountId = account.id;
      await prisma.league.update({
        where: { id: leagueId },
        data: { stripeConnectAccountId: accountId },
      });
    }

    // Generate an Account Link — the director will be prompted to log in to
    // their existing Stripe account or create one during this flow
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${appUrl}/settings?connect_refresh=1`,
      return_url: `${appUrl}/settings?league=${leagueId}&connect_success=1`,
      type: 'account_onboarding',
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err: any) {
    console.error('Stripe connect error:', err?.message ?? err);
    return NextResponse.json(
      { error: err?.message ?? 'Failed to connect Stripe' },
      { status: 500 }
    );
  }
}

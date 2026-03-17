import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// POST /api/stripe/connect { leagueId }
// Creates a Stripe connected account (if not exists) and returns an onboarding URL
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { leagueId } = await req.json();
  const appUrl = process.env.NEXTAUTH_URL ?? 'https://leaguehq.club';

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, ownerId: true, slug: true, stripeConnectAccountId: true },
  });

  if (!league || league.ownerId !== (session.user as any).id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' });

  let accountId = league.stripeConnectAccountId;

  // Create a new connected account if one doesn't exist yet
  if (!accountId) {
    const account = await stripe.accounts.create({ type: 'express' });
    accountId = account.id;
    await prisma.league.update({
      where: { id: leagueId },
      data: { stripeConnectAccountId: accountId },
    });
  }

  // Create an account link for onboarding
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/settings?connect_refresh=1`,
    return_url: `${appUrl}/settings?league=${leagueId}&connect_success=1`,
    type: 'account_onboarding',
  });

  return NextResponse.json({ url: accountLink.url });
}

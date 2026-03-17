import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// GET /api/stripe/connect/status?leagueId=...
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const leagueId = req.nextUrl.searchParams.get('leagueId');
  const league = await prisma.league.findUnique({
    where: { id: leagueId! },
    select: { ownerId: true, stripeConnectAccountId: true },
  });

  if (!league || league.ownerId !== (session.user as any).id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (!league.stripeConnectAccountId) {
    return NextResponse.json({ connected: false, complete: false });
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' });
    const account = await stripe.accounts.retrieve(league.stripeConnectAccountId);
    return NextResponse.json({
      connected: true,
      complete: account.details_submitted,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      accountId: league.stripeConnectAccountId,
    });
  } catch (err: any) {
    console.error('Stripe status error:', err?.message);
    // If the account was deauthorized on Stripe's side, clear it
    if (err?.code === 'account_invalid') {
      await prisma.league.update({
        where: { id: leagueId! },
        data: { stripeConnectAccountId: null },
      });
    }
    return NextResponse.json({ connected: false, complete: false });
  }
}

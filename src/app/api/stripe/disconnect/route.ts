import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// POST /api/stripe/disconnect { leagueId }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { leagueId } = await req.json();
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, ownerId: true, stripeConnectAccountId: true },
  });

  if (!league || league.ownerId !== (session.user as any).id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  if (league.stripeConnectAccountId) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' });
      await stripe.oauth.deauthorize({
        client_id: process.env.STRIPE_CONNECT_CLIENT_ID!,
        stripe_user_id: league.stripeConnectAccountId,
      });
    } catch (e: any) {
      // Log but don't fail — still clear our DB record
      console.error('Stripe deauth error:', e?.message ?? e);
    }
  }

  await prisma.league.update({
    where: { id: leagueId },
    data: { stripeConnectAccountId: null },
  });

  return NextResponse.json({ success: true });
}

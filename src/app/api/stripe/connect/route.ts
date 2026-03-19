import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// POST /api/stripe/connect { leagueId }
// Returns a Stripe OAuth URL. Director clicks it, logs into their existing
// Stripe account, and authorizes LeagueHQ. No sub-accounts are created.
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { leagueId } = await req.json();
  const appUrl = process.env.NEXTAUTH_URL ?? 'https://leaguehq.club';
  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;

  if (!process.env.STRIPE_SECRET_KEY || !clientId) {
    return NextResponse.json({ error: 'Stripe is not configured on this server' }, { status: 500 });
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, ownerId: true, slug: true },
  });

  if (!league || league.ownerId !== (session.user as any).id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Build Stripe OAuth URL — director logs into their own existing Stripe account
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'read_write',
    redirect_uri: `${appUrl}/api/stripe/connect/callback`,
    state: leagueId, // passed back in the callback so we know which league to update
  });

  const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
  return NextResponse.json({ url });
}

// DELETE /api/stripe/connect { leagueId }
// Disconnects the Stripe account from the league (deauthorizes OAuth token).
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { leagueId } = await req.json();

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { ownerId: true, stripeConnectAccountId: true },
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
    } catch (err: any) {
      // If already deauthorized on Stripe's side, just clear DB
      console.error('Stripe deauthorize error:', err?.message);
    }
  }

  await prisma.league.update({
    where: { id: leagueId },
    data: { stripeConnectAccountId: null },
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/stripe/connect { leagueId }
// Returns a Stripe OAuth URL so the director can connect their existing Stripe account
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { leagueId } = await req.json();
  const appUrl = process.env.NEXTAUTH_URL ?? 'https://leaguehq.club';
  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;

  if (!clientId) {
    console.error('STRIPE_CONNECT_CLIENT_ID is not set');
    return NextResponse.json({ error: 'Stripe Connect is not configured on this server' }, { status: 500 });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: 'Stripe is not configured on this server' }, { status: 500 });
  }

  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, ownerId: true },
  });

  if (!league || league.ownerId !== (session.user as any).id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Build Stripe OAuth URL
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'read_write',
    redirect_uri: `${appUrl}/api/stripe/connect/callback`,
    state: leagueId, // We'll use this in the callback to know which league to update
  });

  const oauthUrl = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;
  return NextResponse.json({ url: oauthUrl });
}

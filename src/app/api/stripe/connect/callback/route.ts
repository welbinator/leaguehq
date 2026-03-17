import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// GET /api/stripe/connect/callback
// Stripe redirects here after the director connects their account
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const appUrl = process.env.NEXTAUTH_URL ?? 'https://leaguehq.club';

  const code = req.nextUrl.searchParams.get('code');
  const leagueId = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${appUrl}/dashboard?connect_error=${error}`);
  }

  if (!code || !leagueId) {
    return NextResponse.redirect(`${appUrl}/dashboard?connect_error=missing_params`);
  }

  if (!session?.user) {
    return NextResponse.redirect(`${appUrl}/auth/signin`);
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

    // Exchange code for access token
    const response = await stripe.oauth.token({ grant_type: 'authorization_code', code });
    const connectedAccountId = response.stripe_user_id;

    if (!connectedAccountId) throw new Error('No account ID returned');

    // Save to the league
    const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { id: true, ownerId: true, slug: true } });
    if (!league || league.ownerId !== (session.user as any).id) {
      return NextResponse.redirect(`${appUrl}/dashboard?connect_error=unauthorized`);
    }

    await prisma.league.update({
      where: { id: leagueId },
      data: { stripeConnectAccountId: connectedAccountId },
    });

    return NextResponse.redirect(`${appUrl}/leagues/${league.slug}/settings?connect_success=1`);
  } catch (err: any) {
    console.error('Stripe Connect error:', err);
    return NextResponse.redirect(`${appUrl}/dashboard?connect_error=exchange_failed`);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// GET /api/stripe/connect/callback?code=...&state=leagueId
// Stripe redirects here after the director authorizes OAuth.
// We exchange the code for the director's stripe_user_id and save it.
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXTAUTH_URL ?? 'https://leaguehq.club';
  const code = req.nextUrl.searchParams.get('code');
  const leagueId = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');
  const errorDesc = req.nextUrl.searchParams.get('error_description');

  // Director denied or something went wrong on Stripe's side
  if (error) {
    console.error('[stripe/connect/callback] OAuth error:', error, errorDesc);
    return NextResponse.redirect(`${appUrl}/leagues/${leagueId}/settings?connect_error=${encodeURIComponent(errorDesc ?? error)}`);
  }

  if (!code || !leagueId) {
    return NextResponse.redirect(`${appUrl}/dashboard?connect_error=missing_params`);
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' });

    // Exchange the authorization code for the director's Stripe account ID
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    });

    const stripeUserId = response.stripe_user_id;
    if (!stripeUserId) throw new Error('No stripe_user_id in OAuth response');

    // Find the league slug for the redirect
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      select: { slug: true },
    });

    // Save the director's real Stripe account ID on the league
    await prisma.league.update({
      where: { id: leagueId },
      data: { stripeConnectAccountId: stripeUserId },
    });

    console.log(`[stripe/connect/callback] League ${leagueId} connected to Stripe account ${stripeUserId}`);
    return NextResponse.redirect(`${appUrl}/leagues/${league?.slug}/settings?connect_success=1`);
  } catch (err: any) {
    console.error('[stripe/connect/callback] Token exchange error:', err?.message);
    return NextResponse.redirect(`${appUrl}/dashboard?connect_error=${encodeURIComponent(err?.message ?? 'OAuth failed')}`);
  }
}

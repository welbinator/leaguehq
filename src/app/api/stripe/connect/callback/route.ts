import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

// GET /api/stripe/connect/callback?code=...&state=leagueId
// Stripe redirects here after the director authorizes the connection
export async function GET(req: NextRequest) {
  const appUrl = process.env.NEXTAUTH_URL ?? 'https://leaguehq.club';
  const code = req.nextUrl.searchParams.get('code');
  const leagueId = req.nextUrl.searchParams.get('state');
  const error = req.nextUrl.searchParams.get('error');
  const errorDescription = req.nextUrl.searchParams.get('error_description');

  // User cancelled or error from Stripe
  if (error) {
    console.error('Stripe OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      `${appUrl}/settings?connect_refresh=1&error=${encodeURIComponent(errorDescription ?? error)}`
    );
  }

  if (!code || !leagueId) {
    return NextResponse.redirect(`${appUrl}/settings?connect_refresh=1`);
  }

  try {
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-04-10' });

    // Exchange the code for the connected account ID
    const response = await stripe.oauth.token({
      grant_type: 'authorization_code',
      code,
    });

    const accountId = response.stripe_user_id;
    if (!accountId) throw new Error('No account ID returned from Stripe');

    // Verify the league exists and save the connected account ID
    await prisma.league.update({
      where: { id: leagueId },
      data: { stripeConnectAccountId: accountId },
    });

    return NextResponse.redirect(
      `${appUrl}/settings?league=${leagueId}&connect_success=1`
    );
  } catch (err: any) {
    console.error('Stripe OAuth callback error:', err?.message ?? err);
    return NextResponse.redirect(
      `${appUrl}/settings?connect_refresh=1&error=${encodeURIComponent(err?.message ?? 'Connection failed')}`
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/stripe/connect?leagueId=...
// Redirects league director to Stripe Connect OAuth flow
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const leagueId = req.nextUrl.searchParams.get('leagueId');
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 });

  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID;
  const appUrl = process.env.NEXTAUTH_URL ?? 'https://leaguehq.club';

  if (!clientId) return NextResponse.json({ error: 'Stripe Connect not configured' }, { status: 500 });

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    scope: 'read_write',
    redirect_uri: `${appUrl}/api/stripe/connect/callback`,
    state: leagueId, // pass leagueId through OAuth state
    'stripe_user[business_type]': 'individual',
  });

  return NextResponse.redirect(`https://connect.stripe.com/oauth/authorize?${params.toString()}`);
}

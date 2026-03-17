import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/stripe/disconnect { leagueId }
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { leagueId } = await req.json();
  const league = await prisma.league.findUnique({
    where: { id: leagueId },
    select: { id: true, ownerId: true },
  });

  if (!league || league.ownerId !== (session.user as any).id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  await prisma.league.update({
    where: { id: leagueId },
    data: { stripeConnectAccountId: null },
  });

  return NextResponse.json({ success: true });
}

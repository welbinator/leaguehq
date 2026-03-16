import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/games?leagueId=...
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const leagueId = searchParams.get('leagueId');
  if (!leagueId) return NextResponse.json({ error: 'leagueId is required' }, { status: 400 });

  const games = await prisma.game.findMany({
    where: { leagueId },
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
      season: { select: { id: true, name: true } },
      division: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  return NextResponse.json({ data: games });
}

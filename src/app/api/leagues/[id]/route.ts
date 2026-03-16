import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/leagues/[id] — fetch a single league by id or slug
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = params;

  const league = await prisma.league.findFirst({
    where: {
      OR: [{ id }, { slug: id }],
    },
    include: {
      divisions: { orderBy: { order: 'asc' } },
      seasons: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: {
        select: {
          teams: true,
          registrations: { where: { status: 'APPROVED' } },
          games: true,
        },
      },
    },
  });

  if (!league) {
    return NextResponse.json({ error: 'League not found' }, { status: 404 });
  }

  // Count upcoming and completed games
  const now = new Date();
  const [gamesPlayed, gamesRemaining] = await Promise.all([
    prisma.game.count({ where: { leagueId: league.id, status: 'COMPLETED' } }),
    prisma.game.count({ where: { leagueId: league.id, status: 'SCHEDULED', scheduledAt: { gte: now } } }),
  ]);

  // Upcoming games
  const upcomingGames = await prisma.game.findMany({
    where: { leagueId: league.id, status: 'SCHEDULED', scheduledAt: { gte: now } },
    include: {
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: 'asc' },
    take: 5,
  });

  return NextResponse.json({
    data: {
      ...league,
      gamesPlayed,
      gamesRemaining,
      upcomingGames,
    },
  });
}

// PATCH /api/leagues/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, sport, description, settings } = await req.json();

  const league = await prisma.league.update({
    where: { id: params.id },
    data: {
      ...(name && { name }),
      ...(sport && { sport }),
      ...(description !== undefined && { description }),
      ...(settings && { settings }),
    },
  });

  return NextResponse.json({ data: league });
}

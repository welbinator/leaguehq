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
      seasons: { orderBy: { createdAt: 'desc' }, take: 1, include: { seasonDivisions: { include: { division: true } } } },
      _count: {
        select: {
          teams: true,
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

  // Count team registrations (the actual registration model)
  const seasons = await prisma.season.findMany({ where: { leagueId: league.id }, select: { id: true } });
  const seasonIds = seasons.map((s: any) => s.id);
  // teamRegCount = unique teams (not rejected)
  // playerRegCount = all registered individuals (captains + players), regardless of approval status
  const [teamRegCount, playerRegCount] = await Promise.all([
    prisma.teamRegistration.count({ where: { seasonId: { in: seasonIds }, status: { not: 'REJECTED' } } }),
    prisma.playerRegistration.count({ where: { seasonId: { in: seasonIds } } }),
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
      teamRegCount,
      playerRegCount,
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

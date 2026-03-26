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

  // Count from the Registration model (the canonical registration table)
  const seasons = await prisma.season.findMany({ where: { leagueId: league.id }, select: { id: true } });
  const seasonIds = seasons.map((s: any) => s.id);
  const [teamRegCount, playerRegCount] = await Promise.all([
    // Unique teams with at least one approved registration in this league's seasons
    prisma.registration.groupBy({
      by: ['teamId'],
      where: { leagueId: league.id, seasonId: { in: seasonIds }, status: 'APPROVED', teamId: { not: null } },
    }).then(r => r.length),
    // All approved individual registrations
    prisma.registration.count({ where: { leagueId: league.id, seasonId: { in: seasonIds }, status: 'APPROVED' } }),
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

  const id = params.id;
  const body = await req.json();
  const { name, sport, description, settings, teamChatsEnabled } = body;

  // Fetch existing league to check current teamChatsEnabled value
  const existingLeague = await prisma.league.findUnique({
    where: { id },
    select: { teamChatsEnabled: true, ownerId: true },
  });
  if (!existingLeague) return NextResponse.json({ error: 'League not found' }, { status: 404 });

  // Only the owner can update
  if (existingLeague.ownerId !== (session.user as any).id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const league = await prisma.league.update({
    where: { id },
    data: {
      ...(name && { name }),
      ...(sport && { sport }),
      ...(description !== undefined && { description }),
      ...(settings && { settings }),
      ...(teamChatsEnabled !== undefined && { teamChatsEnabled }),
    },
  });

  // Auto-create team chat rooms when teamChatsEnabled is first turned on
  if (teamChatsEnabled === true && !existingLeague.teamChatsEnabled) {
    const teams = await prisma.team.findMany({
      where: { leagueId: id },
      include: { members: { where: { status: 'ACTIVE' }, select: { userId: true } } },
    });
    for (const team of teams) {
      let room = await prisma.chatRoom.findFirst({ where: { teamId: team.id, type: 'TEAM' } });
      if (!room) {
        room = await prisma.chatRoom.create({
          data: { leagueId: id, name: team.name, type: 'TEAM', teamId: team.id },
        });
      }
      for (const m of team.members) {
        await prisma.chatMember.upsert({
          where: { roomId_userId: { roomId: room.id, userId: m.userId } },
          update: {},
          create: { roomId: room.id, userId: m.userId },
        });
      }
    }
  }

  return NextResponse.json({ data: league });
}

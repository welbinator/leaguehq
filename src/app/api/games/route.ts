import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/games?leagueId=...
// GET /api/games?leagueId=...&userId=...  (filters to games for that user's teams)
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const leagueId = searchParams.get('leagueId');
  const userId = searchParams.get('userId');
  const scheduleGroupId = searchParams.get('scheduleGroupId');

  // userId-only mode: get all games for a player across all leagues
  if (userId && !leagueId) {
    // Find all teams the user is on
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });
    const teamIds = memberships.map(m => m.teamId);

    if (!teamIds.length) return NextResponse.json({ data: [] });

    const games = await prisma.game.findMany({
      where: {
        OR: [
          { homeTeamId: { in: teamIds } },
          { awayTeamId: { in: teamIds } },
        ],
      },
      select: {
        id: true, leagueId: true, seasonId: true, divisionId: true,
        homeTeamId: true, awayTeamId: true, scheduledAt: true, location: true,
        status: true, scheduleGroupId: true, notes: true,
        homeScore: true, awayScore: true,
        scoreStatus: true,
        homeScoreHome: true, awayScoreHome: true,
        homeScoreAway: true, awayScoreAway: true,
        homeTeam: { select: { id: true, name: true } },
        awayTeam: { select: { id: true, name: true } },
        season: { select: { id: true, name: true } },
        division: { select: { id: true, name: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return NextResponse.json({ data: games });
  }

  if (!leagueId) return NextResponse.json({ error: 'leagueId is required' }, { status: 400 });

  let teamIds: string[] | undefined;
  if (userId) {
    const memberships = await prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });
    teamIds = memberships.map(m => m.teamId);
  }

  const games = await prisma.game.findMany({
    where: {
      leagueId,
      ...(scheduleGroupId ? { scheduleGroupId } : {}),
      ...(teamIds !== undefined ? {
        OR: [
          { homeTeamId: { in: teamIds } },
          { awayTeamId: { in: teamIds } },
        ],
      } : {}),
    },
    select: {
      id: true, leagueId: true, seasonId: true, divisionId: true,
      homeTeamId: true, awayTeamId: true, scheduledAt: true, location: true,
      status: true, scheduleGroupId: true, notes: true,
      homeScore: true, awayScore: true,
      scoreStatus: true,
      homeScoreHome: true, awayScoreHome: true,
      homeScoreAway: true, awayScoreAway: true,
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
      season: { select: { id: true, name: true } },
      division: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  return NextResponse.json({ data: games });
}

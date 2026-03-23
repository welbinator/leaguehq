import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateSchedule, ScheduleConfig } from '@/lib/scheduleGenerator';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { leagueId, seasonId, divisionId, type, teamIds, startDate, endDate, gameDays, timeSlots, location } = body;

  if (!leagueId || !seasonId || !divisionId || !type || !teamIds?.length || !startDate || !endDate || !gameDays?.length || !timeSlots?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Verify the user owns this league
  const league = await prisma.league.findFirst({
    where: { id: leagueId, ownerId: (session.user as any).id },
  });
  if (!league) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const teams = await prisma.team.findMany({
    where: { id: { in: teamIds } },
    select: { id: true, name: true },
  });

  const config: ScheduleConfig = {
    type,
    teams,
    startDate,
    endDate,
    gameDays,
    timeSlots,
    location: location ?? '',
  };

  const gameSlots = generateSchedule(config);
  const scheduleGroupId = randomUUID();

  // Filter out TBD placeholder games — only save real matchups
  const realGames = gameSlots.filter(g => g.homeTeamId !== 'TBD' && g.awayTeamId !== 'TBD');

  await prisma.game.createMany({
    data: realGames.map(g => ({
      leagueId,
      seasonId,
      divisionId,
      homeTeamId: g.homeTeamId,
      awayTeamId: g.awayTeamId,
      scheduledAt: g.scheduledAt,
      location: g.location || null,
      status: 'SCHEDULED',
      notes: g.label ?? null,
      scheduleGroupId,
    })),
  });

  return NextResponse.json({ count: realGames.length, scheduleGroupId });
}

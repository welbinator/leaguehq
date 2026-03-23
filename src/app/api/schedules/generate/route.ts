import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateSchedule, ScheduleConfig } from '@/lib/scheduleGenerator';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { seasonId, divisionId, type, teamIds, startDate, endDate, gameDays, timeSlots, location } = body;

  if (!seasonId || !divisionId || !type || !teamIds?.length || !startDate || !endDate || !gameDays?.length || !timeSlots?.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Fetch teams
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

  const games = generateSchedule(config);

  return NextResponse.json({ data: games, count: games.length });
}

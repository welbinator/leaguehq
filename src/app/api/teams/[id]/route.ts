import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/teams/[id] — full team profile: roster, captain, schedule
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const team = await prisma.team.findUnique({
    where: { id: params.id },
    include: {
      captain: { select: { id: true, name: true, firstName: true, lastName: true, avatarUrl: true } },
      coach:   { select: { id: true, name: true, firstName: true, lastName: true } },
      members: {
        where: { status: 'ACTIVE' },
        include: {
          user: { select: { id: true, name: true, firstName: true, lastName: true, avatarUrl: true } },
        },
        orderBy: { joinedAt: 'asc' },
      },
      league:   { select: { id: true, name: true, slug: true, sport: true } },
      division: { select: { id: true, name: true } },
      season:   { select: { id: true, name: true } },
      seasonEnrollments: {
        include: {
          season: { select: { id: true, name: true, status: true } },
          seasonDivision: { include: { division: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });

  // Fetch games for this team
  const games = await prisma.game.findMany({
    where: {
      OR: [{ homeTeamId: team.id }, { awayTeamId: team.id }],
    },
    select: {
      id: true, scheduledAt: true, location: true, status: true,
      scoreStatus: true, homeScore: true, awayScore: true,
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
      season:   { select: { id: true, name: true } },
      division: { select: { id: true, name: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  });

  return NextResponse.json({ data: { ...team, games } });
}

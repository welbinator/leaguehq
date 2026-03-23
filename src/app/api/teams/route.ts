import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/teams?leagueId=... — list all teams for a league
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const leagueId = req.nextUrl.searchParams.get('leagueId');
  const divisionId = req.nextUrl.searchParams.get('divisionId');
  const seasonId = req.nextUrl.searchParams.get('seasonId');
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 });

  // If divisionId+seasonId provided, filter via SeasonEnrollment
  let teamIdFilter: string[] | undefined;
  if (divisionId && seasonId) {
    const enrollments = await prisma.seasonEnrollment.findMany({
      where: {
        seasonId,
        seasonDivision: { divisionId },
      },
      select: { teamId: true },
    });
    teamIdFilter = enrollments.map(e => e.teamId);
  }

  const teams = await prisma.team.findMany({
    where: {
      leagueId,
      ...(teamIdFilter !== undefined ? { id: { in: teamIdFilter } } : {}),
    },
    include: {
      seasonEnrollments: {
        include: {
          season: { select: { id: true, name: true, status: true } },
          seasonDivision: { include: { division: { select: { id: true, name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ data: teams });
}

// POST /api/teams — create a team (league-scoped, no season required)
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { name, leagueId } = await req.json();
  if (!name?.trim() || !leagueId) return NextResponse.json({ error: 'name and leagueId required' }, { status: 400 });

  // Verify league ownership
  const league = await prisma.league.findFirst({
    where: { id: leagueId, ownerId: (session.user as any).id },
  });
  if (!league) return NextResponse.json({ error: 'League not found or unauthorized' }, { status: 403 });

  const team = await prisma.team.create({
    data: { name: name.trim(), leagueId },
    include: {
      seasonEnrollments: {
        include: {
          season: { select: { id: true, name: true, status: true } },
          seasonDivision: { include: { division: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  return NextResponse.json({ data: team }, { status: 201 });
}

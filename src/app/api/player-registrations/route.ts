import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/player-registrations?leagueId=...&seasonId=...
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const leagueId = req.nextUrl.searchParams.get('leagueId');
  const seasonId = req.nextUrl.searchParams.get('seasonId');
  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 });

  const seasons = await prisma.season.findMany({
    where: { leagueId, ...(seasonId ? { id: seasonId } : {}) },
    select: { id: true },
  });
  const seasonIds = seasons.map((s: any) => s.id);

  const players = await prisma.playerRegistration.findMany({
    where: { seasonId: { in: seasonIds } },
    include: {
      season: { select: { id: true, name: true } },
      seasonDivision: { include: { division: { select: { name: true } } } },
      teamRegistration: { select: { id: true, teamName: true, captainName: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: players });
}

// PATCH /api/player-registrations?id=...
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const body = await req.json();
  const { playerName, playerEmail, playerPhone, teamRegistrationId, seasonDivisionId } = body;

  const updated = await prisma.playerRegistration.update({
    where: { id },
    data: {
      ...(playerName !== undefined && { playerName }),
      ...(playerEmail !== undefined && { playerEmail }),
      ...(playerPhone !== undefined && { playerPhone }),
      // null clears the team assignment; undefined means don't touch it
      ...(teamRegistrationId !== undefined && { teamRegistrationId: teamRegistrationId || null }),
      ...(seasonDivisionId !== undefined && { seasonDivisionId: seasonDivisionId || null }),
    },
    include: {
      season: { select: { id: true, name: true } },
      seasonDivision: { include: { division: { select: { name: true } } } },
      teamRegistration: { select: { id: true, teamName: true } },
    },
  });

  return NextResponse.json({ data: updated });
}

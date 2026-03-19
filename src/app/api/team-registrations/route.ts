import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/team-registrations?leagueId=...&seasonId=...&status=...
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const leagueId = req.nextUrl.searchParams.get('leagueId');
  const seasonId = req.nextUrl.searchParams.get('seasonId');
  const status = req.nextUrl.searchParams.get('status');

  if (!leagueId) return NextResponse.json({ error: 'leagueId required' }, { status: 400 });

  const seasons = await prisma.season.findMany({
    where: { leagueId, ...(seasonId ? { id: seasonId } : {}) },
    select: { id: true },
  });
  const seasonIds = seasons.map((s: any) => s.id);

  const registrations = await prisma.teamRegistration.findMany({
    where: {
      seasonId: { in: seasonIds },
      ...(status ? { status } : {}),
    },
    include: {
      season: { select: { id: true, name: true } },
      seasonDivision: { include: { division: { select: { name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: registrations });
}

// PATCH /api/team-registrations — update status
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  const { status } = await req.json();

  if (!id || !status) return NextResponse.json({ error: 'id and status required' }, { status: 400 });

  const updated = await prisma.teamRegistration.update({
    where: { id },
    data: { status },
  });

  return NextResponse.json({ data: updated });
}

// PUT /api/team-registrations?id=... — full edit of a team registration
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const body = await req.json();
  const { teamName, captainName, captainEmail, captainPhone, seasonDivisionId, notes } = body;

  const updated = await prisma.teamRegistration.update({
    where: { id },
    data: {
      ...(teamName !== undefined && { teamName }),
      ...(captainName !== undefined && { captainName }),
      ...(captainEmail !== undefined && { captainEmail }),
      ...(captainPhone !== undefined && { captainPhone: captainPhone || null }),
      ...(seasonDivisionId !== undefined && { seasonDivisionId: seasonDivisionId || null }),
      ...(notes !== undefined && { notes: notes || null }),
    },
    include: {
      season: { select: { id: true, name: true } },
      seasonDivision: { include: { division: { select: { name: true } } } },
    },
  });

  return NextResponse.json({ data: updated });
}

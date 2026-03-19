import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/season-enrollments?leagueId=...&seasonId=...&status=...
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const params = req.nextUrl.searchParams;
  const where: any = {};
  if (params.get('seasonId')) where.seasonId = params.get('seasonId');
  if (params.get('leagueId')) where.team = { leagueId: params.get('leagueId') };
  if (params.get('status')) where.status = params.get('status');

  const enrollments = await prisma.seasonEnrollment.findMany({
    where,
    include: {
      team: { select: { id: true, name: true, leagueId: true } },
      season: { select: { id: true, name: true } },
      seasonDivision: { include: { division: { select: { id: true, name: true } } } },
      playerRegistrations: {
        select: { id: true, playerName: true, playerEmail: true, isCaptain: true }
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: enrollments });
}

// POST /api/season-enrollments — enroll a team in a season
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { teamId, seasonId, seasonDivisionId, status, notes } = await req.json();
  if (!teamId || !seasonId) return NextResponse.json({ error: 'teamId and seasonId required' }, { status: 400 });

  const existing = await prisma.seasonEnrollment.findUnique({
    where: { teamId_seasonId: { teamId, seasonId } },
  });
  if (existing) return NextResponse.json({ error: 'Team already enrolled in this season', data: existing }, { status: 409 });

  const enrollment = await prisma.seasonEnrollment.create({
    data: {
      teamId, seasonId,
      seasonDivisionId: seasonDivisionId ?? null,
      status: status ?? 'PENDING',
      notes: notes ?? null,
    },
    include: {
      team: { select: { id: true, name: true } },
      season: { select: { id: true, name: true } },
      seasonDivision: { include: { division: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json({ data: enrollment }, { status: 201 });
}

// PATCH /api/season-enrollments?id=... — update status or fields
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  const body = await req.json();
  const allowed = ['status','notes','seasonDivisionId','paymentStatus','paymentAmount','paidAt'];
  const data: any = {};
  for (const key of allowed) {
    if (body[key] !== undefined) data[key] = body[key] ?? null;
  }

  const enrollment = await prisma.seasonEnrollment.update({
    where: { id },
    data,
    include: {
      team: { select: { id: true, name: true } },
      season: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: enrollment });
}

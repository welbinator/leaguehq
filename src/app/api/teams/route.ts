import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createTeamSchema = z.object({
  name: z.string().min(1).max(100),
  leagueId: z.string(),
  divisionId: z.string().optional(),
  seasonId: z.string().optional(),
});

// GET /api/teams?leagueId=...
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const leagueId = searchParams.get('leagueId');

  const where = leagueId ? { leagueId } : {};

  const teams = await prisma.team.findMany({
    where,
    include: {
      coach: { select: { id: true, name: true, avatarUrl: true } },
      captain: { select: { id: true, name: true, avatarUrl: true } },
      _count: { select: { members: true } },
    },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json({ data: teams });
}

// POST /api/teams
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createTeamSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const { name, leagueId, divisionId, seasonId } = parsed.data;

    const team = await prisma.team.create({
      data: { name, leagueId, divisionId, seasonId },
    });

    return NextResponse.json({ data: team }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/teams]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

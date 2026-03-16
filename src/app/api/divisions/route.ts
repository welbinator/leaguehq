import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/divisions?leagueId=...
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const leagueId = req.nextUrl.searchParams.get('leagueId');
  if (!leagueId) return NextResponse.json({ error: 'leagueId is required' }, { status: 400 });

  const divisions = await prisma.division.findMany({
    where: { leagueId },
    orderBy: { order: 'asc' },
  });

  return NextResponse.json({ data: divisions });
}

// POST /api/divisions
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { leagueId, name, description, order } = await req.json();
  if (!leagueId || !name) return NextResponse.json({ error: 'leagueId and name required' }, { status: 400 });

  const division = await prisma.division.create({
    data: { leagueId, name, description, order: order ?? 0 },
  });

  return NextResponse.json({ data: division }, { status: 201 });
}

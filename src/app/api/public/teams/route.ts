import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/public/teams?seasonId=...
// Returns teams already registered for this season (no auth required)
export async function GET(req: NextRequest) {
  const seasonId = req.nextUrl.searchParams.get('seasonId');
  if (!seasonId) return NextResponse.json({ data: [] });

  const registrations = await prisma.teamRegistration.findMany({
    where: { seasonId, status: { not: 'REJECTED' } },
    select: {
      id: true,
      teamName: true,
      captainName: true,
      seasonDivisionId: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const teams = registrations.map(r => ({
    id: r.id,
    teamName: r.teamName,
    captainName: r.captainName ?? '',
    seasonDivisionId: r.seasonDivisionId,
  }));

  return NextResponse.json({ data: teams });
}

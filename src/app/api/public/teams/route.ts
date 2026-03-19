import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/public/teams?seasonId=...
// Returns teams enrolled in this season (via SeasonEnrollment), no auth required
export async function GET(req: NextRequest) {
  const seasonId = req.nextUrl.searchParams.get('seasonId');
  if (!seasonId) return NextResponse.json({ data: [] });

  // Get teams via SeasonEnrollment (new architecture)
  const enrollments = await prisma.seasonEnrollment.findMany({
    where: { seasonId, status: { not: 'REJECTED' } },
    include: {
      team: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  const teams = enrollments.map(e => ({
    id: e.teamId,
    teamName: e.team.name,
    enrollmentId: e.id,
    seasonDivisionId: e.seasonDivisionId,
  }));

  // Fall back to legacy TeamRegistration if no enrollments found
  if (teams.length === 0) {
    const legacyRegs = await prisma.teamRegistration.findMany({
      where: { seasonId, status: { not: 'REJECTED' } },
      select: { id: true, teamName: true, captainName: true, seasonDivisionId: true },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({
      data: legacyRegs.map(r => ({
        id: r.id,
        teamName: r.teamName,
        captainName: r.captainName ?? '',
        seasonDivisionId: r.seasonDivisionId,
      }))
    });
  }

  return NextResponse.json({ data: teams });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/public/register/[seasonId]
// Public endpoint — no auth required (used by registration page)
export async function GET(req: NextRequest, { params }: { params: { seasonId: string } }) {
  const season = await prisma.season.findUnique({
    where: { id: params.seasonId },
    include: {
      league: { select: { id: true, name: true, sport: true, slug: true } },
      seasonDivisions: {
        include: { division: true },
        orderBy: { division: { order: 'asc' } },
      },
    },
  });

  if (!season) return NextResponse.json({ error: 'Season not found' }, { status: 404 });
  if (!season.registrationOpen) return NextResponse.json({ error: 'Registration is not currently open for this season.' }, { status: 403 });

  return NextResponse.json({ data: season });
}

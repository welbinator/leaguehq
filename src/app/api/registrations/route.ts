import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/registrations — public, no auth required
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { seasonId, seasonDivisionId, teamName, captainName, captainEmail, captainPhone, notes } = body;

  if (!seasonId || !teamName || !captainName || !captainEmail) {
    return NextResponse.json({ error: 'seasonId, teamName, captainName, and captainEmail are required' }, { status: 400 });
  }

  const season = await prisma.season.findUnique({ where: { id: seasonId }, select: { id: true } });
  if (!season) return NextResponse.json({ error: 'Season not found' }, { status: 404 });

  const registration = await prisma.teamRegistration.create({
    data: {
      seasonId,
      seasonDivisionId: seasonDivisionId || null,
      teamName,
      captainName,
      captainEmail,
      captainPhone: captainPhone || null,
      notes: notes || null,
      status: 'PENDING',
    },
  });

  return NextResponse.json({ data: registration }, { status: 201 });
}

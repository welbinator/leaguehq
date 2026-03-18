import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/registrations — public, no auth required
// Expects userId from the register-player step
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    seasonId, seasonDivisionId,
    isCaptain, teamName, existingTeamId,
    playerName, playerEmail, playerPhone, notes,
    userId,
  } = body;

  if (!seasonId || !playerName || !playerEmail) {
    return NextResponse.json({ error: 'seasonId, playerName, and playerEmail are required' }, { status: 400 });
  }

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { id: true, registrationOpen: true },
  });
  if (!season) return NextResponse.json({ error: 'Season not found' }, { status: 404 });
  if (!season.registrationOpen) return NextResponse.json({ error: 'Registration is not currently open for this season.' }, { status: 403 });

  if (isCaptain) {
    if (!teamName && !existingTeamId) {
      return NextResponse.json({ error: 'Team name or existing team is required for captains' }, { status: 400 });
    }

    let resolvedTeamName = teamName;
    if (existingTeamId) {
      const existing = await prisma.teamRegistration.findUnique({ where: { id: existingTeamId }, select: { teamName: true } });
      resolvedTeamName = existing?.teamName ?? 'Unknown Team';
    }

    const registration = await prisma.teamRegistration.create({
      data: {
        seasonId,
        seasonDivisionId: seasonDivisionId || null,
        userId: userId || null,
        teamName: resolvedTeamName || 'Unnamed Team',
        captainName: playerName,
        captainEmail: playerEmail,
        captainPhone: playerPhone || null,
        notes: notes || null,
        status: 'PENDING',
      },
    });

    return NextResponse.json({ data: registration }, { status: 201 });
  }

  // PLAYER — joining an existing team
  if (!existingTeamId) {
    return NextResponse.json({ error: 'Please select a team to join' }, { status: 400 });
  }

  const playerReg = await prisma.playerRegistration.create({
    data: {
      seasonId,
      seasonDivisionId: seasonDivisionId || null,
      teamRegistrationId: existingTeamId,
      userId: userId || null,
      playerName,
      playerEmail,
      playerPhone: playerPhone || null,
      notes: notes || null,
    },
  });

  return NextResponse.json({ data: playerReg }, { status: 201 });
}

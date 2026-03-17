import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/registrations — public, no auth required
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    seasonId, seasonDivisionId,
    isCaptain, teamName, existingTeamId,
    playerName, playerEmail, playerPhone, notes,
  } = body;

  if (!seasonId || !playerName || !playerEmail) {
    return NextResponse.json({ error: 'seasonId, playerName, and playerEmail are required' }, { status: 400 });
  }

  if (isCaptain && !teamName && !existingTeamId) {
    return NextResponse.json({ error: 'Team name or existing team is required for captains' }, { status: 400 });
  }

  if (!isCaptain && !existingTeamId) {
    return NextResponse.json({ error: 'Please select a team to join' }, { status: 400 });
  }

  const season = await prisma.season.findUnique({ where: { id: seasonId }, select: { id: true } });
  if (!season) return NextResponse.json({ error: 'Season not found' }, { status: 404 });

  // Resolve team name: new team name or look up existing registration
  let resolvedTeamName = teamName;
  if (existingTeamId) {
    const existing = await prisma.teamRegistration.findUnique({ where: { id: existingTeamId }, select: { teamName: true } });
    resolvedTeamName = existing?.teamName ?? 'Unknown Team';
  }

  const registration = await prisma.teamRegistration.create({
    data: {
      seasonId,
      seasonDivisionId: seasonDivisionId || null,
      teamName: resolvedTeamName || 'Unnamed Team',
      captainName: playerName,
      captainEmail: playerEmail,
      captainPhone: playerPhone || null,
      notes: [
        isCaptain ? 'Role: Captain' : 'Role: Player',
        existingTeamId ? `Joining team: ${resolvedTeamName}` : null,
        notes,
      ].filter(Boolean).join('\n') || null,
      status: 'PENDING',
    },
  });

  return NextResponse.json({ data: registration }, { status: 201 });
}

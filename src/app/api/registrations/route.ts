import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/registrations — public, no auth required
// Handles both captain (team) and player registrations using the new
// Team + SeasonEnrollment architecture.
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    seasonId, seasonDivisionId,
    isCaptain, teamName, existingTeamId,
    playerName, playerEmail, playerPhone, notes,
    userId, directorCreated, paymentRequired,
  } = body;

  if (!seasonId || !playerName || !playerEmail) {
    return NextResponse.json({ error: 'seasonId, playerName, and playerEmail are required' }, { status: 400 });
  }

  const season = await prisma.season.findUnique({
    where: { id: seasonId },
    select: { id: true, registrationOpen: true, leagueId: true },
  });
  if (!season) return NextResponse.json({ error: 'Season not found' }, { status: 404 });

  // Directors can bypass the registration open check
  if (!directorCreated && !season.registrationOpen) {
    return NextResponse.json({ error: 'Registration is not currently open for this season.' }, { status: 403 });
  }

  if (isCaptain) {
    if (!teamName && !existingTeamId) {
      return NextResponse.json({ error: 'Team name or existing team is required for captains' }, { status: 400 });
    }

    let team: any;

    if (existingTeamId) {
      // Captain re-registering an existing team for a new season
      team = await prisma.team.findUnique({ where: { id: existingTeamId } });
      if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    } else {
      // Find or create a Team in this league with this name
      team = await prisma.team.findFirst({
        where: { leagueId: season.leagueId, name: teamName.trim() },
      });
      if (!team) {
        team = await prisma.team.create({
          data: { leagueId: season.leagueId, name: teamName.trim() },
        });
      }
    }

    // Find or create a SeasonEnrollment for this team+season
    let enrollment = await prisma.seasonEnrollment.findUnique({
      where: { teamId_seasonId: { teamId: team.id, seasonId } },
    });
    if (!enrollment) {
      enrollment = await prisma.seasonEnrollment.create({
        data: {
          teamId: team.id,
          seasonId,
          seasonDivisionId: seasonDivisionId || null,
          status: paymentRequired ? 'AWAITING_PAYMENT' : 'PENDING',
          notes: notes || null,
        },
      });
    }

    // Create a PlayerRegistration for the captain (isCaptain: true)
    const captainReg = await prisma.playerRegistration.create({
      data: {
        seasonId,
        seasonDivisionId: seasonDivisionId || null,
        teamId: team.id,
        seasonEnrollmentId: enrollment.id,
        isCaptain: true,
        paymentStatus: paymentRequired ? 'awaiting_payment' : null,
        userId: userId || null,
        playerName,
        playerEmail,
        playerPhone: playerPhone || null,
        notes: notes || null,
      },
    });

    return NextResponse.json({ data: { ...enrollment, captainRegistrationId: captainReg.id, id: enrollment.id } }, { status: 201 });
  }

  // PLAYER — joining an existing team (by teamId or legacy teamRegistrationId)
  if (!existingTeamId) {
    return NextResponse.json({ error: 'Please select a team to join' }, { status: 400 });
  }

  // existingTeamId could be a Team.id (new) or TeamRegistration.id (legacy)
  // Try Team first
  let teamId = existingTeamId;
  let enrollmentId: string | null = null;

  const team = await prisma.team.findUnique({ where: { id: existingTeamId } });
  if (team) {
    // Find the SeasonEnrollment for this team+season
    const enrollment = await prisma.seasonEnrollment.findUnique({
      where: { teamId_seasonId: { teamId: team.id, seasonId } },
    });
    enrollmentId = enrollment?.id ?? null;
  } else {
    // Legacy: existingTeamId is a TeamRegistration.id
    teamId = null;
  }

  const playerReg = await prisma.playerRegistration.create({
    data: {
      seasonId,
      seasonDivisionId: seasonDivisionId || null,
      teamId: teamId || null,
      seasonEnrollmentId: enrollmentId || null,
      // Legacy fallback
      teamRegistrationId: team ? null : existingTeamId,
      isCaptain: false,
      userId: userId || null,
      playerName,
      playerEmail,
      playerPhone: playerPhone || null,
      notes: notes || null,
    },
  });

  return NextResponse.json({ data: playerReg }, { status: 201 });
}

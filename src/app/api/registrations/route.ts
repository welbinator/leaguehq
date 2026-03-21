import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Plan limits: max players per league per season (null = unlimited)
const PLAN_LIMITS: Record<string, number | null> = {
  FREE:    0,    // FREE tier can't collect registrations at all
  STARTER: 100,
  GROWTH:  500,
  PRO:     null, // unlimited
};

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
    select: {
      id: true,
      registrationOpen: true,
      leagueId: true,
      league: {
        select: {
          owner: {
            select: { subscriptionTier: true, subscriptionStatus: true },
          },
        },
      },
    },
  });
  if (!season) return NextResponse.json({ error: 'Season not found' }, { status: 404 });

  // Directors can bypass the registration open check
  if (!directorCreated && !season.registrationOpen) {
    return NextResponse.json({ error: 'Registration is not currently open for this season.' }, { status: 403 });
  }

  // Enforce plan player limits (directors bypass this too)
  if (!directorCreated) {
    const owner = season.league.owner;
    const tier = owner?.subscriptionTier ?? 'FREE';
    const isActive = owner?.subscriptionStatus === 'ACTIVE';
    const limit = isActive ? (PLAN_LIMITS[tier] ?? null) : PLAN_LIMITS['FREE'];

    if (limit !== null) {
      // Count all players registered for this league across all seasons
      const currentCount = await prisma.playerRegistration.count({
        where: { season: { leagueId: season.leagueId } },
      });

      if (currentCount >= limit) {
        // Auto-close registration on this season since we're at the limit
        await prisma.season.update({
          where: { id: seasonId },
          data: { registrationOpen: false },
        });
        return NextResponse.json({
          error: 'Registration is not currently open for this season.',
        }, { status: 403 });
      }
    }
  }

  if (isCaptain) {
    if (!teamName && !existingTeamId) {
      return NextResponse.json({ error: 'Team name or existing team is required for captains' }, { status: 400 });
    }

    let team: any;

    if (existingTeamId) {
      team = await prisma.team.findUnique({ where: { id: existingTeamId } });
      if (!team) return NextResponse.json({ error: 'Team not found' }, { status: 404 });
    } else {
      team = await prisma.team.findFirst({
        where: { leagueId: season.leagueId, name: teamName.trim() },
      });
      if (!team) {
        team = await prisma.team.create({
          data: { leagueId: season.leagueId, name: teamName.trim() },
        });
      }
    }

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

    // After registering, check if we've now hit the plan limit and auto-close if so
    await maybeAutoCloseRegistration(seasonId, season.leagueId, season.league.owner);

    return NextResponse.json({ data: { ...enrollment, captainRegistrationId: captainReg.id, id: enrollment.id } }, { status: 201 });
  }

  // PLAYER — joining an existing team
  if (!existingTeamId) {
    return NextResponse.json({ error: 'Please select a team to join' }, { status: 400 });
  }

  let teamId = existingTeamId;
  let enrollmentId: string | null = null;

  const team = await prisma.team.findUnique({ where: { id: existingTeamId } });
  if (team) {
    const enrollment = await prisma.seasonEnrollment.findUnique({
      where: { teamId_seasonId: { teamId: team.id, seasonId } },
    });
    enrollmentId = enrollment?.id ?? null;
  } else {
    teamId = null;
  }

  const playerReg = await prisma.playerRegistration.create({
    data: {
      seasonId,
      seasonDivisionId: seasonDivisionId || null,
      teamId: teamId || null,
      seasonEnrollmentId: enrollmentId || null,
      teamRegistrationId: team ? null : existingTeamId,
      isCaptain: false,
      userId: userId || null,
      playerName,
      playerEmail,
      playerPhone: playerPhone || null,
      notes: notes || null,
    },
  });

  // After registering, check if we've now hit the plan limit and auto-close if so
  await maybeAutoCloseRegistration(seasonId, season.leagueId, season.league.owner);

  return NextResponse.json({ data: playerReg }, { status: 201 });
}

// After a successful registration, check if the plan limit has been reached.
// If so, automatically close registration on this season.
async function maybeAutoCloseRegistration(
  seasonId: string,
  leagueId: string,
  owner: { subscriptionTier: string; subscriptionStatus: string } | null
) {
  const tier = owner?.subscriptionTier ?? 'FREE';
  const isActive = owner?.subscriptionStatus === 'ACTIVE';
  const limit = isActive ? (PLAN_LIMITS[tier] ?? null) : PLAN_LIMITS['FREE'];

  if (limit === null) return; // unlimited plan, nothing to do

  const currentCount = await prisma.playerRegistration.count({
    where: { season: { leagueId } },
  });

  if (currentCount >= limit) {
    await prisma.season.update({
      where: { id: seasonId },
      data: { registrationOpen: false },
    });
    console.log(`[registrations] Auto-closed season ${seasonId} — player limit ${limit} reached (${currentCount} players)`);
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Plan limits: max active/upcoming players across all leagues owned by the director (null = unlimited)
const PLAN_LIMITS: Record<string, number | null> = {
  FREE:    0,    // FREE tier can't collect registrations at all
  STARTER: 100,
  GROWTH:  500,
  PRO:     null, // unlimited
};

// Count players registered in ACTIVE or UPCOMING seasons across all leagues owned by this director.
async function countActivePlayers(directorId: string): Promise<number> {
  return prisma.playerRegistration.count({
    where: {
      season: {
        status: { in: ['ACTIVE', 'UPCOMING'] },
        league: { ownerId: directorId },
      },
    },
  });
}

// After a successful registration, check if the plan limit has been reached.
// If so, automatically close registration on this season.
async function maybeAutoCloseRegistration(
  seasonId: string,
  directorId: string,
  owner: { subscriptionTier: string; subscriptionStatus: string } | null
) {
  const tier = owner?.subscriptionTier ?? 'FREE';
  const isActive = owner?.subscriptionStatus === 'ACTIVE';
  const limit = isActive ? (PLAN_LIMITS[tier] ?? null) : PLAN_LIMITS['FREE'];

  if (limit === null) return; // unlimited plan, nothing to do

  const currentCount = await countActivePlayers(directorId);

  if (currentCount >= limit) {
    await prisma.season.update({
      where: { id: seasonId },
      data: { registrationOpen: false },
    });
    console.log(`[registrations] Auto-closed season ${seasonId} — plan limit ${limit} reached (${currentCount} active players for director ${directorId})`);
  }
}

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
          ownerId: true,
          owner: {
            select: { subscriptionTier: true, subscriptionStatus: true },
          },
        },
      },
    },
  });
  if (!season) return NextResponse.json({ error: 'Season not found' }, { status: 404 });

  // Directors can bypass the registration open check and plan limits
  if (!directorCreated && !season.registrationOpen) {
    return NextResponse.json({ error: 'Registration is not currently open for this season.' }, { status: 403 });
  }

  // Enforce plan player limits (directors bypass this)
  if (!directorCreated) {
    const owner = season.league.owner;
    const directorId = season.league.ownerId;
    const tier = owner?.subscriptionTier ?? 'FREE';
    const isActive = owner?.subscriptionStatus === 'ACTIVE';
    const limit = isActive ? (PLAN_LIMITS[tier] ?? null) : PLAN_LIMITS['FREE'];

    if (limit !== null) {
      const currentCount = await countActivePlayers(directorId);

      if (currentCount >= limit) {
        // Auto-close registration since limit is already reached
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

    // Set captainId on the team if we have a userId
    if (userId && team.captainId !== userId) {
      await prisma.team.update({
        where: { id: team.id },
        data: { captainId: userId, seasonId },
      });
    }

    // Ensure captain is a TeamMember
    if (userId) {
      await prisma.teamMember.upsert({
        where: { teamId_userId: { teamId: team.id, userId } },
        create: { teamId: team.id, userId, role: 'CAPTAIN', status: 'ACTIVE' },
        update: { role: 'CAPTAIN', status: 'ACTIVE' },
      });
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

    await maybeAutoCloseRegistration(seasonId, season.league.ownerId, season.league.owner);

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

  // Create TeamMember record so player appears on team roster
  if (userId && teamId) {
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId, userId } },
      create: { teamId, userId, role: 'PLAYER', status: 'ACTIVE' },
      update: { status: 'ACTIVE' },
    });
  }

  await maybeAutoCloseRegistration(seasonId, season.league.ownerId, season.league.owner);

  return NextResponse.json({ data: playerReg }, { status: 201 });
}

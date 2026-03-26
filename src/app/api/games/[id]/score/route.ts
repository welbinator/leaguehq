import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/games/[id]/score
 *
 * Body: { homeScore: number, awayScore: number }
 *
 * Roles:
 *   - League director: sets score directly, marks CONFIRMED
 *   - Home team captain: records homeScoreHome/awayScoreHome pending submission
 *   - Away team captain: records homeScoreAway/awayScoreAway pending submission
 *   - After both captains submit:
 *       - Scores match  → CONFIRMED, homeScore/awayScore set
 *       - Scores differ → DISPUTED, director must resolve
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { homeScore, awayScore } = await req.json();

  if (typeof homeScore !== 'number' || typeof awayScore !== 'number') {
    return NextResponse.json({ error: 'homeScore and awayScore must be numbers' }, { status: 400 });
  }

  // Load game + league
  const game = await prisma.game.findUnique({
    where: { id: params.id },
    include: {
      league: { select: { id: true, ownerId: true } },
      homeTeam: { select: { id: true, captainId: true } },
      awayTeam: { select: { id: true, captainId: true } },
    },
  });

  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  const userId = (session.user as any).id as string;
  const isDirector = game.league.ownerId === userId;
  const isHomeCaptain = game.homeTeam.captainId === userId;
  const isAwayCaptain = game.awayTeam.captainId === userId;

  if (!isDirector && !isHomeCaptain && !isAwayCaptain) {
    return NextResponse.json({ error: 'Only the league director or team captain can submit scores' }, { status: 403 });
  }

  // ── Director: set score directly ────────────────────────────────────────
  if (isDirector) {
    const updated = await prisma.game.update({
      where: { id: params.id },
      data: {
        homeScore,
        awayScore,
        status: 'COMPLETED',
        scoreStatus: 'CONFIRMED',
        // Clear any pending captain submissions
        homeScoreHome: null,
        awayScoreHome: null,
        homeScoreAway: null,
        awayScoreAway: null,
      },
    });
    return NextResponse.json({ data: updated });
  }

  // ── Captain submission ───────────────────────────────────────────────────
  const updateData: Record<string, any> = {};

  if (isHomeCaptain) {
    updateData.homeScoreHome = homeScore;
    updateData.awayScoreHome = awayScore;
  } else {
    updateData.homeScoreAway = homeScore;
    updateData.awayScoreAway = awayScore;
  }

  // Merge pending scores with existing to check for match
  const merged = {
    homeScoreHome: game.homeScoreHome,
    awayScoreHome: game.awayScoreHome,
    homeScoreAway: game.homeScoreAway,
    awayScoreAway: game.awayScoreAway,
    ...updateData,
  };

  const homeSideSubmitted = merged.homeScoreHome !== null && merged.homeScoreHome !== undefined;
  const awaySideSubmitted = merged.homeScoreAway !== null && merged.homeScoreAway !== undefined;

  if (homeSideSubmitted && awaySideSubmitted) {
    // Both sides have submitted — check for agreement
    if (merged.homeScoreHome === merged.homeScoreAway && merged.awayScoreHome === merged.awayScoreAway) {
      // ✅ Confirmed
      Object.assign(updateData, {
        homeScore: merged.homeScoreHome,
        awayScore: merged.awayScoreHome,
        status: 'COMPLETED',
        scoreStatus: 'CONFIRMED',
        // Clear staging fields
        homeScoreHome: null,
        awayScoreHome: null,
        homeScoreAway: null,
        awayScoreAway: null,
      });
    } else {
      // ⚠️ Disputed
      Object.assign(updateData, { scoreStatus: 'DISPUTED' });
    }
  } else {
    // Only one side submitted so far
    updateData.scoreStatus = isHomeCaptain ? 'PENDING_HOME' : 'PENDING_AWAY';
    // If other side already submitted, override to appropriate PENDING state
    if (homeSideSubmitted || awaySideSubmitted) {
      updateData.scoreStatus = homeSideSubmitted && awaySideSubmitted ? updateData.scoreStatus : (homeSideSubmitted ? 'PENDING_HOME' : 'PENDING_AWAY');
    }
  }

  const updated = await prisma.game.update({
    where: { id: params.id },
    data: updateData,
  });

  return NextResponse.json({ data: updated });
}

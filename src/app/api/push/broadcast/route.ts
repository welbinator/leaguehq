import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendPushToMany, sportIcon } from '@/lib/webpush';

// POST /api/push/broadcast — director sends notification to players
// audience: 'league' | 'season' | 'all'
// leagueId or seasonId required when audience is 'league' or 'season'
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const directorId = (session.user as any).id;

  const { title, body, audience, leagueId, seasonId } = await req.json();
  if (!title || !body || !audience) {
    return NextResponse.json({ error: 'title, body, and audience are required' }, { status: 400 });
  }

  let userIds: string[] = [];
  let sport: string | null = null;

  if (audience === 'league' && leagueId) {
    // Verify director owns this league
    const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { ownerId: true, sport: true } });
    if (league?.ownerId !== directorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    sport = league?.sport ?? null;

    const members = await prisma.teamMember.findMany({
      where: { team: { leagueId }, status: 'ACTIVE', userId: { not: undefined as any } },
      select: { userId: true },
    });
    userIds = Array.from(new Set(members.map(m => m.userId).filter((id): id is string => !!id)));

  } else if (audience === 'season' && seasonId) {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      select: { league: { select: { ownerId: true, sport: true } } },
    });
    if (season?.league.ownerId !== directorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    sport = season?.league.sport ?? null;

    const regs = await prisma.playerRegistration.findMany({
      where: { seasonId, userId: { not: undefined as any } },
      select: { userId: true },
    });
    userIds = Array.from(new Set(regs.map(r => r.userId).filter((id): id is string => !!id)));

  } else if (audience === 'all') {
    // All players across all leagues owned by this director
    const leagues = await prisma.league.findMany({ where: { ownerId: directorId }, select: { id: true, sport: true } });
    const leagueIds = leagues.map(l => l.id);
    // Use sport from first league as icon (mixed-sport broadcast gets generic icon)
    sport = leagues[0]?.sport ?? null;
    const members = await prisma.teamMember.findMany({
      where: { team: { leagueId: { in: leagueIds } }, status: 'ACTIVE', userId: { not: undefined as any } },
      select: { userId: true },
    });
    userIds = Array.from(new Set(members.map(m => m.userId).filter((id): id is string => !!id)));
  } else {
    return NextResponse.json({ error: 'Invalid audience' }, { status: 400 });
  }

  if (!userIds.length) return NextResponse.json({ ok: true, sent: 0 });

  await sendPushToMany(userIds, { title, body, url: '/dashboard/player', tag: 'broadcast', icon: sportIcon(sport) });
  return NextResponse.json({ ok: true, sent: userIds.length });
}

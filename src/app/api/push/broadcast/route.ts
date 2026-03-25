import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendPushToMany } from '@/lib/webpush';

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

  if (audience === 'league' && leagueId) {
    // Verify director owns this league
    const league = await prisma.league.findUnique({ where: { id: leagueId }, select: { ownerId: true } });
    if (league?.ownerId !== directorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const members = await prisma.teamMember.findMany({
      where: { team: { leagueId }, status: 'ACTIVE', userId: { not: undefined as any } },
      select: { userId: true },
    });
    userIds = [...new Set(members.map(m => m.userId!))];

  } else if (audience === 'season' && seasonId) {
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
      select: { league: { select: { ownerId: true } } },
    });
    if (season?.league.ownerId !== directorId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const regs = await prisma.playerRegistration.findMany({
      where: { seasonId, userId: { not: undefined as any } },
      select: { userId: true },
    });
    userIds = [...new Set(regs.map(r => r.userId!))];

  } else if (audience === 'all') {
    // All players across all leagues owned by this director
    const leagues = await prisma.league.findMany({ where: { ownerId: directorId }, select: { id: true } });
    const leagueIds = leagues.map(l => l.id);
    const members = await prisma.teamMember.findMany({
      where: { team: { leagueId: { in: leagueIds } }, status: 'ACTIVE', userId: { not: undefined as any } },
      select: { userId: true },
    });
    userIds = [...new Set(members.map(m => m.userId!))];
  } else {
    return NextResponse.json({ error: 'Invalid audience' }, { status: 400 });
  }

  if (!userIds.length) return NextResponse.json({ ok: true, sent: 0 });

  await sendPushToMany(userIds, { title, body, url: '/dashboard/player', tag: 'broadcast' });
  return NextResponse.json({ ok: true, sent: userIds.length });
}

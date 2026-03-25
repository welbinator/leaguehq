import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chat/league-rooms?slug=xxx
// Returns all rooms in a league with membership status for the current user
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');
  if (!slug) return NextResponse.json({ error: 'slug required' }, { status: 400 });

  const league = await prisma.league.findUnique({
    where: { slug },
    select: { id: true, ownerId: true },
  });
  if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 });

  // Must be league director
  if (league.ownerId !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const rooms = await prisma.chatRoom.findMany({
    where: { leagueId: league.id },
    include: {
      team: { select: { id: true, name: true } },
      season: { select: { id: true, name: true } },
      members: { where: { userId }, select: { id: true } },
      _count: { select: { members: true } },
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  });

  const data = rooms.map(room => ({
    id: room.id,
    name: room.name,
    type: room.type,
    teamId: room.teamId,
    seasonId: room.seasonId,
    team: room.team,
    season: room.season,
    isMember: room.members.length > 0,
    memberCount: room._count.members,
  }));

  return NextResponse.json({ data });
}

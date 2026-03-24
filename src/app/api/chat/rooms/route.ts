import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get('slug');

  // If a league slug is provided, return only rooms in that league the user is a member of
  if (slug) {
    const league = await prisma.league.findUnique({ where: { slug }, select: { id: true } });
    if (!league) return NextResponse.json({ error: 'League not found' }, { status: 404 });

    const memberships = await prisma.chatMember.findMany({
      where: {
        userId,
        room: { leagueId: league.id },
      },
      include: {
        room: {
          select: { id: true, name: true, type: true, teamId: true, seasonId: true },
        },
      },
      orderBy: { joinedAt: 'asc' },
    });

    return NextResponse.json({ data: memberships.map(m => m.room) });
  }

  // Otherwise return all rooms the user is a member of
  const memberships = await prisma.chatMember.findMany({
    where: { userId },
    include: {
      room: {
        include: {
          team: { select: { id: true, name: true } },
          season: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  return NextResponse.json({ data: memberships.map(m => m.room) });
}

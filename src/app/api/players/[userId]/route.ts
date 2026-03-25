import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(_req: NextRequest, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: params.userId },
    select: {
      id: true,
      name: true,
      firstName: true,
      lastName: true,
      teamMemberships: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          role: true,
          team: { select: { id: true, name: true } },
        },
      },
      playerRegistrations: {
        select: {
          id: true,
          isCaptain: true,
          season: {
            select: {
              id: true,
              name: true,
              league: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { season: { startDate: 'desc' } },
        take: 5,
      },
    },
  });

  if (!user) return NextResponse.json({ error: 'Player not found' }, { status: 404 });
  return NextResponse.json({ data: user });
}

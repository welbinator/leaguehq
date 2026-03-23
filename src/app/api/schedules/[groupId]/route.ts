import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function DELETE(req: NextRequest, { params }: { params: { groupId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { groupId } = params;

  // Verify ownership via the first game in this group
  const sample = await prisma.game.findFirst({
    where: { scheduleGroupId: groupId },
    include: { league: { select: { ownerId: true } } },
  });

  if (!sample) return NextResponse.json({ error: 'Schedule group not found' }, { status: 404 });
  if (sample.league.ownerId !== (session.user as any).id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { count } = await prisma.game.deleteMany({
    where: { scheduleGroupId: groupId },
  });

  return NextResponse.json({ deleted: count });
}

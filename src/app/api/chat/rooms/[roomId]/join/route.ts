import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/chat/rooms/[roomId]/join
export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const { roomId } = params;

  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: { id: true, league: { select: { ownerId: true } } },
  });
  if (!room) return NextResponse.json({ error: 'Room not found' }, { status: 404 });
  if (room.league?.ownerId !== userId) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  await prisma.chatMember.upsert({
    where: { roomId_userId: { roomId, userId } },
    create: { roomId, userId },
    update: {},
  });

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  _req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const { roomId } = params;

  const member = await prisma.chatMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const messages = await prisma.chatMessage.findMany({
    where: { roomId },
    include: {
      user: { select: { id: true, name: true, firstName: true, lastName: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'asc' },
    take: 100,
  });

  return NextResponse.json({ data: messages });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { roomId: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const { roomId } = params;

  const member = await prisma.chatMember.findUnique({
    where: { roomId_userId: { roomId, userId } },
  });
  if (!member) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { content } = await req.json();
  if (!content?.trim()) return NextResponse.json({ error: 'Message required' }, { status: 400 });

  const message = await prisma.chatMessage.create({
    data: { roomId, userId, content: content.trim() },
    include: {
      user: { select: { id: true, name: true, firstName: true, lastName: true, avatarUrl: true } },
    },
  });

  if ((global as any).io) {
    (global as any).io.to(roomId).emit('new-message', message);
  }

  return NextResponse.json({ data: message });
}

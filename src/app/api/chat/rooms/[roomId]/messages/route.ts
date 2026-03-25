import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendPushToMany } from '@/lib/webpush';

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

  // Emit via Socket.io
  if ((global as any).io) {
    (global as any).io.to(roomId).emit('new-message', message);
  }

  // Push notifications — notify all other room members (async, don't block response)
  const senderName = message.user.firstName
    ? `${message.user.firstName}${message.user.lastName ? ' ' + message.user.lastName : ''}`
    : message.user.name;

  const room = await prisma.chatRoom.findUnique({
    where: { id: roomId },
    select: { name: true, type: true },
  });

  const otherMembers = await prisma.chatMember.findMany({
    where: { roomId, userId: { not: userId } },
    select: { userId: true },
  });

  const recipientIds = otherMembers.map(m => m.userId);
  if (recipientIds.length > 0) {
    const url = room?.type === 'DIRECT' ? '/dashboard/messages' : '/dashboard/player';
    sendPushToMany(recipientIds, {
      title: room?.type === 'DIRECT' ? `Message from ${senderName}` : `${senderName} in ${room?.name ?? 'chat'}`,
      body: content.trim().slice(0, 100),
      url,
      tag: `chat-${roomId}`,
    }).catch(() => {});
  }

  return NextResponse.json({ data: message });
}

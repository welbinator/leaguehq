import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/chat/dm — get or create a DM room between current user and another user
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const myId = (session.user as any).id;

  const { otherUserId } = await req.json();
  if (!otherUserId || otherUserId === myId) {
    return NextResponse.json({ error: 'Invalid user' }, { status: 400 });
  }

  // Check if a DIRECT room already exists between these two users
  const existing = await prisma.chatRoom.findFirst({
    where: {
      type: 'DIRECT',
      members: { some: { userId: myId } },
      AND: [{ members: { some: { userId: otherUserId } } }],
    },
    include: { members: { select: { userId: true } } },
  });

  // Verify it's exactly these two (no extra members)
  const room = existing && existing.members.length === 2 ? existing : null;

  if (room) {
    return NextResponse.json({ data: { roomId: room.id } });
  }

  // Get other user's name for room label
  const other = await prisma.user.findUnique({
    where: { id: otherUserId },
    select: { name: true, firstName: true, lastName: true },
  });
  const otherName = other?.firstName
    ? `${other.firstName}${other.lastName ? ' ' + other.lastName : ''}`
    : other?.name ?? 'Unknown';

  const me = await prisma.user.findUnique({
    where: { id: myId },
    select: { name: true, firstName: true, lastName: true },
  });
  const myName = me?.firstName
    ? `${me.firstName}${me.lastName ? ' ' + me.lastName : ''}`
    : me?.name ?? 'Unknown';

  // Create new DM room
  const newRoom = await prisma.chatRoom.create({
    data: {
      name: `${myName} & ${otherName}`,
      type: 'DIRECT',
      members: {
        create: [{ userId: myId }, { userId: otherUserId }],
      },
    },
  });

  return NextResponse.json({ data: { roomId: newRoom.id } }, { status: 201 });
}

// GET /api/chat/dm — list all DM rooms for current user
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const myId = (session.user as any).id;

  const memberships = await prisma.chatMember.findMany({
    where: { userId: myId, room: { type: 'DIRECT' } },
    include: {
      room: {
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, firstName: true, lastName: true } },
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { content: true, createdAt: true },
          },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  });

  const dms = memberships.map(m => {
    const other = m.room.members.find(mem => mem.userId !== myId);
    const otherUser = other?.user;
    const displayName = otherUser?.firstName
      ? `${otherUser.firstName}${otherUser.lastName ? ' ' + otherUser.lastName : ''}`
      : otherUser?.name ?? 'Unknown';
    const lastMsg = m.room.messages[0];
    return {
      roomId: m.room.id,
      otherUserId: otherUser?.id,
      otherName: displayName,
      lastMessage: lastMsg?.content ?? null,
      lastMessageAt: lastMsg?.createdAt ?? null,
    };
  });

  return NextResponse.json({ data: dms });
}

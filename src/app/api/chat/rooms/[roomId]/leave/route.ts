import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/chat/rooms/[roomId]/leave
export async function POST(req: NextRequest, { params }: { params: { roomId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const userId = (session.user as any).id;
  const { roomId } = params;

  await prisma.chatMember.deleteMany({ where: { roomId, userId } });

  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/seasons/[id]
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const season = await prisma.season.findUnique({
    where: { id: params.id },
    include: { seasonDivisions: { include: { division: true } } },
  });

  if (!season) return NextResponse.json({ error: 'Season not found' }, { status: 404 });
  return NextResponse.json({ data: season });
}

// PATCH /api/seasons/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = params.id;
  const body = await req.json();
  const { name, startDate, endDate, registrationOpen, paymentRequired, paymentDueDate, status, divisions, chatEnabled } = body;

  // Fetch existing to check chatEnabled before update
  const existingSeason = await prisma.season.findUnique({
    where: { id },
    select: { chatEnabled: true, leagueId: true, name: true },
  });
  if (!existingSeason) return NextResponse.json({ error: 'Season not found' }, { status: 404 });

  const season = await prisma.$transaction(async (tx) => {
    const s = await tx.season.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(registrationOpen !== undefined && { registrationOpen }),
        ...(paymentRequired !== undefined && { paymentRequired }),
        ...(paymentDueDate !== undefined && { paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : null }),
        ...(status && { status }),
        ...(chatEnabled !== undefined && { chatEnabled }),
      },
    });

    if (divisions) {
      await tx.seasonDivision.deleteMany({ where: { seasonId: id } });
      if (divisions.length) {
        await tx.seasonDivision.createMany({
          data: divisions.map((d: any) => ({
            seasonId: id,
            divisionId: d.divisionId,
            price: d.price,
            pricingType: d.pricingType ?? 'PER_PLAYER',
          })),
        });
      }
    }

    return tx.season.findUnique({
      where: { id: s.id },
      include: { seasonDivisions: { include: { division: true } } },
    });
  });

  // Auto-create season chat room when chatEnabled is first turned on
  if (chatEnabled === true && !existingSeason.chatEnabled) {
    let room = await prisma.chatRoom.findFirst({ where: { seasonId: id, type: 'SEASON' } });
    if (!room) {
      room = await prisma.chatRoom.create({
        data: {
          leagueId: existingSeason.leagueId,
          name: name ?? existingSeason.name,
          type: 'SEASON',
          seasonId: id,
        },
      });
    }
    const regs = await prisma.playerRegistration.findMany({
      where: { seasonId: id, userId: { not: null } },
      select: { userId: true },
    });
    for (const r of regs) {
      if (!r.userId) continue;
      await prisma.chatMember.upsert({
        where: { roomId_userId: { roomId: room.id, userId: r.userId } },
        update: {},
        create: { roomId: room.id, userId: r.userId },
      });
    }
  }

  return NextResponse.json({ data: season });
}

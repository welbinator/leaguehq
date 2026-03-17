import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/seasons?leagueId=...
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const leagueId = req.nextUrl.searchParams.get('leagueId');
  if (!leagueId) return NextResponse.json({ error: 'leagueId is required' }, { status: 400 });

  const seasons = await prisma.season.findMany({
    where: { leagueId },
    include: {
      seasonDivisions: { include: { division: true }, orderBy: { division: { order: 'asc' } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json({ data: seasons });
}

// POST /api/seasons
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const {
    leagueId, name, startDate, endDate,
    registrationOpen, paymentRequired, paymentDueDate,
    // inlineDivisions: create divisions + season_divisions in one shot
    // [{name, price, pricingType, isDefault?}]
    inlineDivisions,
    // legacy: pre-existing division IDs
    divisions,
  } = body;

  if (!leagueId || !name || !startDate || !endDate) {
    return NextResponse.json({ error: 'leagueId, name, startDate, endDate are required' }, { status: 400 });
  }

  const season = await prisma.$transaction(async (tx) => {
    const s = await tx.season.create({
      data: {
        leagueId,
        name,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        registrationOpen: registrationOpen ?? false,
        paymentRequired: paymentRequired ?? false,
        paymentDueDate: paymentDueDate ? new Date(paymentDueDate) : null,
      },
    });

    // inlineDivisions: create the Division records, then link via SeasonDivision
    if (inlineDivisions?.length) {
      for (let i = 0; i < inlineDivisions.length; i++) {
        const d = inlineDivisions[i];
        const div = await tx.division.create({
          data: {
            leagueId,
            name: d.name ?? 'General',
            order: i,
          },
        });
        await tx.seasonDivision.create({
          data: {
            seasonId: s.id,
            divisionId: div.id,
            price: d.price ?? 0,
            pricingType: d.pricingType ?? 'PER_PLAYER',
          },
        });
      }
    }

    // legacy: pre-existing division IDs
    if (divisions?.length) {
      await tx.seasonDivision.createMany({
        data: divisions.map((d: any) => ({
          seasonId: s.id,
          divisionId: d.divisionId,
          price: d.price ?? 0,
          pricingType: d.pricingType ?? 'PER_PLAYER',
        })),
      });
    }

    return tx.season.findUnique({
      where: { id: s.id },
      include: { seasonDivisions: { include: { division: true } } },
    });
  });

  return NextResponse.json({ data: season }, { status: 201 });
}

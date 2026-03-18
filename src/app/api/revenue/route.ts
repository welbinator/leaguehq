import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/revenue?leagueId=...&period=month|alltime
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const leagueId = req.nextUrl.searchParams.get('leagueId');
  const period = req.nextUrl.searchParams.get('period') ?? 'month';

  // Get all leagues owned by this user (or specific league)
  const leagues = await prisma.league.findMany({
    where: {
      ownerId: (session.user as any).id,
      ...(leagueId ? { id: leagueId } : {}),
    },
    select: { id: true },
  });
  const leagueIds = leagues.map(l => l.id);

  const seasons = await prisma.season.findMany({
    where: { leagueId: { in: leagueIds } },
    select: { id: true },
  });
  const seasonIds = seasons.map(s => s.id);

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const where: any = {
    seasonId: { in: seasonIds },
    paymentStatus: 'paid',
    ...(period === 'month' ? { paidAt: { gte: startOfMonth } } : {}),
  };

  const result = await prisma.teamRegistration.aggregate({
    where,
    _sum: { paymentAmount: true },
    _count: { id: true },
  });

  return NextResponse.json({
    data: {
      total: Number(result._sum.paymentAmount ?? 0),
      count: result._count.id,
      period,
    },
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/cron/season-status?secret=...
// Updates season statuses based on current date.
// UPCOMING → ACTIVE when startDate <= now
// ACTIVE → COMPLETED when endDate < today
// Protect with CRON_SECRET env var (optional but recommended).
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [activated, completed] = await Promise.all([
    prisma.season.updateMany({
      where: { status: 'UPCOMING', startDate: { lte: now } },
      data: { status: 'ACTIVE' },
    }),
    prisma.season.updateMany({
      where: { status: 'ACTIVE', endDate: { lt: todayMidnight } },
      data: { status: 'COMPLETED' },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    activated: activated.count,
    completed: completed.count,
    checkedAt: now.toISOString(),
  });
}

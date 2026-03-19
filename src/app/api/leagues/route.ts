import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createLeagueSchema = z.object({
  name: z.string().min(2).max(150),
  sport: z.string().min(1).max(50),
  description: z.string().max(500).optional(),
});

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// GET /api/leagues — list leagues for authenticated user
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const leagues = await prisma.league.findMany({
    where: { ownerId: (session.user as any).id },
    include: {
      seasons: { select: { id: true } },
      _count: {
        select: { teams: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Attach TeamRegistration counts per league
  const enriched = await Promise.all(leagues.map(async (league: any) => {
    const seasonIds = league.seasons.map((s: any) => s.id);
    const [teamRegCount, playerRegCount] = await Promise.all([
      prisma.teamRegistration.count({ where: { seasonId: { in: seasonIds }, status: { not: 'REJECTED' } } }),
      prisma.playerRegistration.count({ where: { seasonId: { in: seasonIds } } }),
    ]);
    return { ...league, teamRegCount, playerRegCount };
  }));

  return NextResponse.json({ data: enriched });
}

// POST /api/leagues — create a new league
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = createLeagueSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? 'Invalid input' },
        { status: 400 }
      );
    }

    const { name, sport, description } = parsed.data;
    const userId = (session.user as any).id;

    // Require active paid subscription to create a league
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionTier: true, subscriptionStatus: true },
    });
    const hasPaidPlan = user?.subscriptionTier !== 'FREE' && user?.subscriptionStatus === 'ACTIVE';
    if (!hasPaidPlan) {
      return NextResponse.json(
        { error: 'SUBSCRIPTION_REQUIRED', message: 'A paid plan is required to create a league.' },
        { status: 403 }
      );
    }

    // Generate unique slug
    let slug = slugify(name);
    const existing = await prisma.league.findUnique({ where: { slug } });
    if (existing) {
      slug = `${slug}-${Date.now()}`;
    }

    const league = await prisma.league.create({
      data: {
        name,
        slug,
        sport,
        description,
        ownerId: userId,
        settings: {
          rosterManagedBy: 'COACH',
          minRosterSize: 1,
          maxRosterSize: 30,
          allowMultipleTeams: false,
          refereesInApp: false,
          pricingType: 'PER_PLAYER',
        },
      },
    });

    return NextResponse.json({ data: league }, { status: 201 });
  } catch (error) {
    console.error('[POST /api/leagues]', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

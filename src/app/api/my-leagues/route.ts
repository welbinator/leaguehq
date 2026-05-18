import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/my-leagues — returns all leagues the current user is connected to,
// with their role in each (director, player, or both).
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = (session.user as any).id;

  // Leagues where user is the owner (director)
  const directorLeagues = await prisma.league.findMany({
    where: { ownerId: userId },
    select: {
      id: true,
      name: true,
      slug: true,
      sport: true,
      logoUrl: true,
      seasons: {
        select: { id: true, name: true, status: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Leagues where user has a registration (player)
  const registrations = await prisma.registration.findMany({
    where: { userId },
    select: {
      id: true,
      status: true,
      season: {
        select: {
          id: true,
          name: true,
          status: true,
          league: {
            select: {
              id: true,
              name: true,
              slug: true,
              sport: true,
              logoUrl: true,
            },
          },
        },
      },
      team: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Build a map of leagueId → league entry
  const leagueMap = new Map<string, {
    id: string;
    name: string;
    slug: string;
    sport: string;
    logoUrl: string | null;
    isDirector: boolean;
    isPlayer: boolean;
    latestSeason: { id: string; name: string; status: string } | null;
    teamName: string | null;
    registrationStatus: string | null;
  }>();

  // Add director leagues
  for (const league of directorLeagues) {
    leagueMap.set(league.id, {
      id: league.id,
      name: league.name,
      slug: league.slug,
      sport: league.sport,
      logoUrl: league.logoUrl,
      isDirector: true,
      isPlayer: false,
      latestSeason: league.seasons[0] ?? null,
      teamName: null,
      registrationStatus: null,
    });
  }

  // Add/augment player leagues
  for (const reg of registrations) {
    const league = reg.season?.league;
    if (!league) continue;

    const existing = leagueMap.get(league.id);
    if (existing) {
      // Already in map as director — mark as player too
      existing.isPlayer = true;
      if (!existing.teamName) existing.teamName = reg.team?.name ?? null;
      if (!existing.registrationStatus) existing.registrationStatus = reg.status;
    } else {
      leagueMap.set(league.id, {
        id: league.id,
        name: league.name,
        slug: league.slug,
        sport: league.sport,
        logoUrl: league.logoUrl,
        isDirector: false,
        isPlayer: true,
        latestSeason: reg.season ? { id: reg.season.id, name: reg.season.name, status: reg.season.status } : null,
        teamName: reg.team?.name ?? null,
        registrationStatus: reg.status,
      });
    }
  }

  return NextResponse.json({ data: Array.from(leagueMap.values()) });
}

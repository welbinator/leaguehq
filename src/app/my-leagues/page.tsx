'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { setActiveLeague } from '@/lib/activeLeague';

const SPORT_EMOJI: Record<string, string> = {
  Soccer: '⚽', Basketball: '🏀', Baseball: '⚾', Football: '🏈',
  Volleyball: '🏐', Tennis: '🎾', Hockey: '🏒', Softball: '🥎',
  Lacrosse: '🥍', Rugby: '🏉', Other: '🏆',
};

type LeagueEntry = {
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
};

export default function LeaguePickerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [leagues, setLeagues] = useState<LeagueEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin');
      return;
    }
    if (status !== 'authenticated') return;

    fetch('/api/my-leagues')
      .then(r => r.json())
      .then(json => {
        const data: LeagueEntry[] = json.data ?? [];
        // If only one league, store it and skip the picker
        if (data.length === 1) {
          const l = data[0];
          setActiveLeague({ id: l.id, slug: l.slug, name: l.name, sport: l.sport, logoUrl: l.logoUrl, isDirector: l.isDirector, isPlayer: l.isPlayer });
          router.replace(l.isDirector ? `/dashboard` : `/dashboard/player`);
          return;
        }
        setLeagues(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [status, router]);

  function selectLeague(league: LeagueEntry) {
    setActiveLeague({ id: league.id, slug: league.slug, name: league.name, sport: league.sport, logoUrl: league.logoUrl, isDirector: league.isDirector, isPlayer: league.isPlayer });
    router.push(league.isDirector ? '/dashboard' : '/dashboard/player');
  }

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (leagues.length === 0) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">🏆</div>
          <h1 className="text-2xl font-black text-white mb-2">No leagues yet</h1>
          <p className="text-gray-400 mb-6">You're not part of any leagues. Create one or register for a season.</p>
          <a href="/pricing" className="inline-block bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold px-6 py-3 rounded-xl transition-colors">
            Get Started →
          </a>
          <button onClick={() => signOut({ callbackUrl: '/auth/signin' })} className="block mx-auto mt-4 text-sm text-gray-500 hover:text-gray-300 transition-colors">
            Sign out
          </button>
        </div>
      </div>
    );
  }

  const user = session?.user as any;
  const displayName = user?.name?.split(' ')[0] ?? 'there';

  return (
    <div className="min-h-screen bg-[#0a0f1e] py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-10">
          <div className="text-4xl mb-3">👋</div>
          <h1 className="text-3xl font-black text-white">Welcome back, {displayName}</h1>
          <p className="text-gray-400 mt-2">Choose a league to continue</p>
        </div>

        <div className="space-y-3">
          {leagues.map(league => {
            const emoji = SPORT_EMOJI[league.sport] ?? '🏆';
            const roles = [];
            if (league.isDirector) roles.push('League Director');
            if (league.isPlayer) roles.push(league.teamName ? `Player · ${league.teamName}` : 'Player');

            return (
              <button
                key={league.id}
                onClick={() => selectLeague(league)}
                className="w-full text-left bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.08] hover:border-[#22c55e]/40 rounded-2xl p-5 transition-all duration-150 group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-[#1e293b] border border-white/[0.06] flex items-center justify-center text-2xl flex-shrink-0">
                    {league.logoUrl
                      ? <img src={league.logoUrl} alt={league.name} className="w-full h-full rounded-xl object-cover" />
                      : emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white font-bold text-lg leading-tight group-hover:text-[#22c55e] transition-colors truncate">
                      {league.name}
                    </h2>
                    <p className="text-gray-400 text-sm mt-0.5">{league.sport}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {roles.map(r => (
                        <span key={r} className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          r === 'League Director'
                            ? 'bg-[#22c55e]/15 text-[#22c55e] border border-[#22c55e]/20'
                            : 'bg-white/[0.06] text-gray-300 border border-white/[0.08]'
                        }`}>{r}</span>
                      ))}
                    </div>
                  </div>
                  {league.latestSeason && (
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      <p className="text-xs text-gray-500">Current season</p>
                      <p className="text-sm text-white font-medium">{league.latestSeason.name}</p>
                    </div>
                  )}
                  <span className="text-gray-600 group-hover:text-[#22c55e] transition-colors text-lg flex-shrink-0">›</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="text-center mt-8">
          <button onClick={() => signOut({ callbackUrl: '/auth/signin' })} className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

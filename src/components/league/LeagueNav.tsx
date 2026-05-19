'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getActiveLeague, setActiveLeague, type ActiveLeague } from '@/lib/activeLeague';

const SPORT_EMOJI: Record<string, string> = {
  Soccer: '⚽', Basketball: '🏀', Baseball: '⚾', Football: '🏈',
  Volleyball: '🏐', Tennis: '🎾', Hockey: '🏒', Softball: '🥎',
  Lacrosse: '🥍', Rugby: '🏉', Other: '🏆',
};

type LeagueNavLeague = {
  id: string;
  slug: string;
  name: string;
  sport: string;
  logoUrl?: string | null;
  ownerId?: string;
  isDirector?: boolean;
  isPlayer?: boolean;
};

interface LeagueNavProps {
  /** Pass a slug when rendering on /leagues/[slug] pages */
  slug?: string;
}

export function LeagueNav({ slug: slugProp }: LeagueNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [league, setLeague] = useState<LeagueNavLeague | null>(null);
  const [isDirector, setIsDirector] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [allLeagues, setAllLeagues] = useState<ActiveLeague[]>([]);
  const switcherRef = useRef<HTMLDivElement>(null);

  // Determine the slug to use: prop → active league in localStorage
  const slug = slugProp ?? (typeof window !== 'undefined' ? getActiveLeague()?.slug : undefined);

  useEffect(() => {
    if (!slug) return;

    Promise.all([
      fetch(`/api/leagues/${slug}`).then(r => r.json()),
      fetch('/api/account').then(r => r.json()),
      fetch('/api/my-leagues').then(r => r.json()),
    ]).then(([leagueJson, accountJson, myLeaguesJson]) => {
      if (!leagueJson.error) setLeague(leagueJson.data);
      const uid = accountJson?.data?.id ?? null;
      if (uid && leagueJson.data?.ownerId === uid) setIsDirector(true);
      // Build all-leagues list for switcher
      const leagues: ActiveLeague[] = (myLeaguesJson.data ?? []).map((l: any) => ({
        id: l.id,
        slug: l.slug,
        name: l.name,
        sport: l.sport,
        logoUrl: l.logoUrl,
        isDirector: l.isDirector,
        isPlayer: l.isPlayer,
      }));
      setAllLeagues(leagues);
    }).catch(() => {});
  }, [slug]);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); setSwitcherOpen(false); }, [pathname]);

  // Close switcher on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Prevent body scroll when mobile menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  function switchLeague(l: ActiveLeague) {
    setActiveLeague(l);
    setSwitcherOpen(false);
    setMenuOpen(false);
    router.push(l.isDirector ? '/dashboard' : '/dashboard/player');
  }

  const tabs = slug ? [
    { label: 'Overview', href: `/leagues/${slug}` },
    { label: 'Teams', href: `/leagues/${slug}/teams` },
    { label: 'Chat', href: isDirector ? `/leagues/${slug}/chat` : `/dashboard/player?tab=chat` },
    { label: 'Players', href: `/leagues/${slug}/players` },
    { label: 'Schedule', href: isDirector ? `/leagues/${slug}/schedule` : `/dashboard/player?tab=schedule` },
    { label: 'Standings', href: `/leagues/${slug}/standings` },
    { label: 'Seasons', href: `/leagues/${slug}/seasons` },
    ...(isDirector ? [{ label: 'Settings', href: `/leagues/${slug}/settings` }] : []),
  ] : [];

  const emoji = league ? (SPORT_EMOJI[league.sport] ?? '🏆') : '🏆';
  const multiLeague = allLeagues.length > 1;

  return (
    <>
      <header className="bg-surface border-b border-white/[0.06] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* Left: league name + optional switcher */}
            <div className="flex items-center gap-1 min-w-0" ref={switcherRef}>
              <Link href={slug ? `/leagues/${slug}` : '/dashboard'} className="flex items-center gap-2.5 min-w-0">
                <span className="text-xl leading-none">{emoji}</span>
                <span className="text-white font-bold text-sm truncate max-w-[140px] sm:max-w-xs">
                  {league?.name ?? '…'}
                </span>
              </Link>

              {/* League switcher chevron */}
              {multiLeague && (
                <div className="relative">
                  <button
                    onClick={() => setSwitcherOpen(o => !o)}
                    className="ml-1 p-1 text-gray-500 hover:text-white transition-colors rounded"
                    aria-label="Switch league"
                  >
                    <svg className={`w-4 h-4 transition-transform ${switcherOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {switcherOpen && (
                    <div className="absolute left-0 top-full mt-1 w-64 bg-surface border border-white/[0.1] rounded-xl shadow-xl overflow-hidden z-50">
                      <p className="text-xs text-gray-500 px-4 pt-3 pb-1 font-medium uppercase tracking-wide">Switch League</p>
                      {allLeagues.map(l => (
                        <button
                          key={l.id}
                          onClick={() => switchLeague(l)}
                          className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-white/[0.05] transition-colors ${l.slug === slug ? 'text-accent' : 'text-white'}`}
                        >
                          <span className="text-lg">{SPORT_EMOJI[l.sport] ?? '🏆'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{l.name}</p>
                            <p className="text-xs text-gray-500">{l.isDirector ? 'Director' : 'Player'}</p>
                          </div>
                          {l.slug === slug && <span className="text-accent text-xs">✓</span>}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Desktop tab nav */}
            <nav className="hidden md:flex items-center gap-0.5 overflow-x-auto">
              {tabs.map(tab => {
                const isActive = pathname === tab.href;
                return (
                  <Link key={tab.href} href={tab.href}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                      isActive ? 'text-white bg-white/10' : 'text-gray-400 hover:text-white hover:bg-white/5'
                    }`}>
                    {tab.label}
                  </Link>
                );
              })}
              <Link href={isDirector ? "/dashboard" : "/dashboard/player"}
                className="ml-3 pl-3 border-l border-white/10 text-sm text-gray-500 hover:text-gray-300 whitespace-nowrap transition-colors">
                ← Dashboard
              </Link>
            </nav>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="md:hidden p-2 text-gray-400 hover:text-white transition-colors"
              aria-label="Open menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile backdrop */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 bg-black/60 z-40" onClick={() => setMenuOpen(false)} />
      )}

      {/* Mobile slide-out drawer */}
      <div className={`md:hidden fixed top-0 right-0 h-full w-72 bg-surface border-l border-white/[0.06] z-50 flex flex-col transition-transform duration-200 ${menuOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 h-14 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <span className="text-lg">{emoji}</span>
            <span className="text-white font-bold text-sm truncate max-w-[180px]">{league?.name ?? '…'}</span>
          </div>
          <button onClick={() => setMenuOpen(false)} className="text-gray-400 hover:text-white p-1 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Drawer nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {tabs.map(tab => {
            const isActive = pathname === tab.href;
            return (
              <Link key={tab.href} href={tab.href}
                className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  isActive ? 'bg-accent/10 text-accent border border-accent/20' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}>
                {tab.label}
              </Link>
            );
          })}

          {/* League switcher in mobile drawer */}
          {multiLeague && (
            <div className="pt-2 border-t border-white/[0.06] mt-2">
              <p className="text-xs text-gray-500 px-4 py-2 font-medium uppercase tracking-wide">Switch League</p>
              {allLeagues.map(l => (
                <button key={l.id} onClick={() => switchLeague(l)}
                  className={`w-full text-left flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                    l.slug === slug ? 'text-accent' : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}>
                  <span>{SPORT_EMOJI[l.sport] ?? '🏆'}</span>
                  <span className="truncate">{l.name}</span>
                  {l.slug === slug && <span className="ml-auto text-xs">✓</span>}
                </button>
              ))}
            </div>
          )}
        </nav>

        {/* Back to dashboard */}
        <div className="px-3 py-4 border-t border-white/[0.06]">
          <Link href={isDirector ? "/dashboard" : "/dashboard/player"}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </Link>
        </div>
      </div>
    </>
  );
}

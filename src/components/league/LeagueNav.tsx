'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SPORT_EMOJI: Record<string, string> = {
  Soccer: '⚽', Basketball: '🏀', Baseball: '⚾', Football: '🏈',
  Volleyball: '🏐', Tennis: '🎾', Hockey: '🏒', Softball: '🥎',
  Lacrosse: '🥍', Rugby: '🏉', Other: '🏆',
};

export function LeagueNav({ slug }: { slug: string }) {
  const pathname = usePathname();
  const [league, setLeague] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    fetch(`/api/leagues/${slug}`)
      .then(r => r.json())
      .then(json => { if (!json.error) setLeague(json.data); })
      .catch(() => {});
  }, [slug]);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  // Prevent body scroll when menu open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const tabs = [
    { label: 'Overview', href: `/leagues/${slug}` },
    { label: 'Teams', href: `/leagues/${slug}/teams` },
    { label: 'Schedule', href: `/leagues/${slug}/schedule` },
    { label: 'Standings', href: `/leagues/${slug}/standings` },
    { label: 'Settings', href: `/leagues/${slug}/settings` },
  ];

  const emoji = league ? (SPORT_EMOJI[league.sport] ?? '🏆') : '🏆';

  return (
    <>
      <header className="bg-surface border-b border-white/[0.06] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">

            {/* Left: league name */}
            <Link href={`/leagues/${slug}`} className="flex items-center gap-2.5 min-w-0">
              <span className="text-xl leading-none">{emoji}</span>
              <span className="text-white font-bold text-sm truncate max-w-[160px] sm:max-w-xs">
                {league?.name ?? '…'}
              </span>
            </Link>

            {/* Desktop tab nav */}
            <nav className="hidden md:flex items-center gap-0.5">
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
              <Link href="/dashboard"
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
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMenuOpen(false)}
        />
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
        <nav className="flex-1 px-3 py-4 space-y-1">
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
        </nav>

        {/* Back to dashboard */}
        <div className="px-3 py-4 border-t border-white/[0.06]">
          <Link href="/dashboard"
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

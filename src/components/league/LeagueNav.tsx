'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const SPORT_EMOJI: Record<string, string> = {
  Soccer: '⚽', Basketball: '🏀', Baseball: '⚾', Football: '🏈',
  Volleyball: '🏐', Tennis: '🎾', Hockey: '🏒', Softball: '🥎',
  Lacrosse: '🥍', Rugby: '🏉', Other: '🏆',
};

interface LeagueNavProps {
  slug: string;
}

export function LeagueNav({ slug }: LeagueNavProps) {
  const pathname = usePathname();
  const [league, setLeague] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/leagues/${slug}`)
      .then((r) => r.json())
      .then((json) => { if (!json.error) setLeague(json.data); })
      .catch(() => {});
  }, [slug]);

  const tabs = [
    { label: 'Overview', href: `/leagues/${slug}` },
    { label: 'Teams', href: `/leagues/${slug}/teams` },
    { label: 'Schedule', href: `/leagues/${slug}/schedule` },
    { label: 'Standings', href: `/leagues/${slug}/standings` },
    { label: 'Settings', href: `/leagues/${slug}/settings` },
  ];

  const emoji = league ? (SPORT_EMOJI[league.sport] ?? '🏆') : '🏆';

  return (
    <header className="bg-surface border-b border-white/[0.06] sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left: league name as "logo" */}
          <Link
            href={`/leagues/${slug}`}
            className="flex items-center gap-2.5 min-w-0"
          >
            <span className="text-xl leading-none">{emoji}</span>
            <span className="text-white font-bold text-sm truncate max-w-[180px] sm:max-w-xs">
              {league?.name ?? '…'}
            </span>
          </Link>

          {/* Right: tab nav */}
          <nav className="flex items-center gap-0.5 overflow-x-auto">
            {tabs.map((tab) => {
              const isActive = pathname === tab.href;
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                    isActive
                      ? 'text-white bg-white/10'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
            <Link
              href="/dashboard"
              className="ml-3 pl-3 border-l border-white/10 text-sm text-gray-500 hover:text-gray-300 whitespace-nowrap transition-colors"
            >
              ← Dashboard
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}

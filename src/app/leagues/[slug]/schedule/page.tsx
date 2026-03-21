'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import type { GameStatus } from '@/types';

const statusVariant: Record<GameStatus, 'default' | 'success' | 'warning' | 'danger'> = {
  SCHEDULED: 'default',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  POSTPONED: 'warning',
};

interface SchedulePageProps {
  params: { slug: string };
}

export default function SchedulePage({ params }: SchedulePageProps) {
  const { slug } = params;
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/leagues/${slug}`)
      .then((r) => r.json())
      .then(async (json) => {
        if (json.error) throw new Error(json.error);
        const gamesRes = await fetch(`/api/games?leagueId=${json.data.id}`);
        const gamesJson = await gamesRes.json();
        if (gamesJson.error) throw new Error(gamesJson.error);
        setGames(gamesJson.data ?? []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-white">Schedule</h2>
            <p className="text-gray-400">{loading ? 'Loading…' : `${games.length} game${games.length !== 1 ? 's' : ''}`}</p>
          </div>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : games.length > 0 ? (
          <Card>
            <div className="space-y-1">
              {games.map((game, i) => {
                const date = new Date(game.scheduledAt);
                const score = game.status === 'COMPLETED' && game.homeScore != null
                  ? `${game.homeScore} - ${game.awayScore}`
                  : null;
                return (
                  <div key={game.id} className={`flex items-center gap-4 py-4 ${i < games.length - 1 ? 'border-b border-white/[0.06]' : ''}`}>
                    <div className="text-center min-w-[60px]">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">
                        {date.toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                      <div className="text-xl font-black text-white">{date.getDate()}</div>
                      <div className="text-xs text-gray-400">
                        {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 font-medium text-white">
                        <span>{game.homeTeam.name}</span>
                        {score ? (
                          <span className="text-accent font-black text-lg">{score}</span>
                        ) : (
                          <span className="text-gray-500 text-sm">vs</span>
                        )}
                        <span>{game.awayTeam.name}</span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                        {game.location && (
                          <span className="flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {game.location}
                          </span>
                        )}
                        {game.season && <span>{game.season.name}</span>}
                        {game.division && <span>· {game.division.name}</span>}
                      </div>
                    </div>
                    <Badge variant={statusVariant[game.status as GameStatus]}>
                      {game.status.charAt(0) + game.status.slice(1).toLowerCase()}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-4">📅</div>
            <h3 className="text-xl font-bold text-white mb-2">No games scheduled</h3>
            <p className="text-gray-400">Games will appear here once they're added to the schedule.</p>
          </div>
        )}
      </div>
    </div>
  );
}

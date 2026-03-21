'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';

interface StandingsPageProps {
  params: { slug: string };
}

interface TeamRow {
  id: string;
  name: string;
  w: number;
  l: number;
  d: number;
  gf: number;
  ga: number;
  pts: number;
}

function computeStandings(games: any[]): TeamRow[] {
  const map = new Map<string, TeamRow>();

  const ensure = (team: any) => {
    if (!map.has(team.id)) {
      map.set(team.id, { id: team.id, name: team.name, w: 0, l: 0, d: 0, gf: 0, ga: 0, pts: 0 });
    }
    return map.get(team.id)!;
  };

  for (const game of games) {
    if (game.status !== 'COMPLETED' || game.homeScore == null || game.awayScore == null) continue;
    const home = ensure(game.homeTeam);
    const away = ensure(game.awayTeam);
    home.gf += game.homeScore; home.ga += game.awayScore;
    away.gf += game.awayScore; away.ga += game.homeScore;
    if (game.homeScore > game.awayScore) { home.w++; home.pts += 3; away.l++; }
    else if (game.homeScore < game.awayScore) { away.w++; away.pts += 3; home.l++; }
    else { home.d++; home.pts += 1; away.d++; away.pts += 1; }
  }

  return Array.from(map.values()).sort((a, b) =>
    b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf
  );
}

export default function StandingsPage({ params }: StandingsPageProps) {
  const { slug } = params;
  const [standings, setStandings] = useState<TeamRow[]>([]);
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
        setStandings(computeStandings(gamesJson.data ?? []));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white">Standings</h2>
          <p className="text-gray-400">Based on completed games</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : standings.length > 0 ? (
          <>
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {['#', 'Team', 'W', 'L', 'D', 'GF', 'GA', 'GD', 'Pts'].map((col) => (
                        <th key={col} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {standings.map((row, i) => (
                      <tr key={row.id} className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3">
                          <span className="text-sm font-semibold text-white">{row.name}</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-white">{row.w}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{row.l}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{row.d}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{row.gf}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">{row.ga}</td>
                        <td className="px-4 py-3 text-sm text-gray-400">
                          {row.gf - row.ga > 0 ? `+${row.gf - row.ga}` : row.gf - row.ga}
                        </td>
                        <td className="px-4 py-3 text-sm font-black text-accent">{row.pts}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <p className="text-xs text-gray-500 mt-4">
              GD = Goal Difference. Pts = Points (Win=3, Draw=1, Loss=0).
            </p>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-4">🏅</div>
            <h3 className="text-xl font-bold text-white mb-2">No standings yet</h3>
            <p className="text-gray-400">Standings will update automatically as games are completed.</p>
          </div>
        )}
      </div>
    </div>
  );
}

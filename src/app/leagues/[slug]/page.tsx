'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { LeagueNav } from '@/components/league/LeagueNav';
import { Card } from '@/components/ui/Card';
import { CreateSeasonModal } from '@/components/league/CreateSeasonModal';

const SPORT_EMOJI: Record<string, string> = {
  Soccer: '⚽', Basketball: '🏀', Baseball: '⚾', Football: '🏈',
  Volleyball: '🏐', Tennis: '🎾', Hockey: '🏒', Softball: '🥎',
  Lacrosse: '🥍', Rugby: '🏉', Other: '🏆',
};

interface LeaguePageProps {
  params: { slug: string };
}

export default function LeaguePage({ params }: LeaguePageProps) {
  const { slug } = params;
  const [league, setLeague] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [seasonModalOpen, setSeasonModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/leagues/${slug}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setLeague(json.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !league) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">🏆</div>
          <h2 className="text-xl font-bold text-white mb-2">League not found</h2>
          <p className="text-gray-400 mb-4">{error ?? 'This league does not exist.'}</p>
          <Link href="/dashboard" className="text-accent hover:underline text-sm">← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const currentSeason = league.seasons?.[0] ?? null;
  const emoji = SPORT_EMOJI[league.sport] ?? '🏆';
  const teamCount = league._count?.teams ?? 0;
  const playerCount = league._count?.registrations ?? 0;

  return (
    <div className="min-h-screen bg-navy">
      <LeagueNav slug={slug} />

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h2 className="text-xl font-bold text-white mb-4">Current Season</h2>
              {currentSeason ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-3 border-b border-white/[0.06]">
                    <span className="text-gray-400">Season</span>
                    <span className="text-white font-medium">{currentSeason.name}</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/[0.06]">
                    <span className="text-gray-400">Status</span>
                    <Badge variant={currentSeason.registrationOpen ? 'success' : 'default'} dot>
                      {currentSeason.registrationOpen ? 'Registration Open' : currentSeason.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-white/[0.06]">
                    <span className="text-gray-400">Start Date</span>
                    <span className="text-white font-medium">
                      {new Date(currentSeason.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-3">
                    <span className="text-gray-400">Registration Fee</span>
                    <span className="text-accent font-bold">
                      ${Number(currentSeason.price).toFixed(0)}/player
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-400 text-sm mb-3">No seasons created yet.</p>
                  <button onClick={() => setSeasonModalOpen(true)} className="text-accent text-sm hover:underline">
                    Create your first season →
                  </button>
                </div>
              )}
            </Card>

            <Card>
              <h2 className="text-xl font-bold text-white mb-4">Upcoming Games</h2>
              {league.upcomingGames?.length > 0 ? (
                <div className="space-y-3">
                  {league.upcomingGames.map((game: any) => {
                    const date = new Date(game.scheduledAt);
                    return (
                      <div key={game.id} className="flex items-center gap-4 py-3 border-b border-white/[0.06] last:border-0">
                        <div className="text-center min-w-[50px]">
                          <div className="text-xs text-gray-400 uppercase">
                            {date.toLocaleDateString('en-US', { month: 'short' })}
                          </div>
                          <div className="text-xl font-black text-white">{date.getDate()}</div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 text-sm font-medium text-white">
                            {game.homeTeam.name} <span className="text-gray-500">vs</span> {game.awayTeam.name}
                          </div>
                          <div className="text-xs text-gray-400 mt-0.5">
                            {date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                            {game.location && ` · ${game.location}`}
                          </div>
                        </div>
                        <Badge variant="default">Scheduled</Badge>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-8">No upcoming games scheduled.</p>
              )}
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-bold text-white mb-4">Quick Stats</h3>
              <div className="space-y-3">
                {[
                  { label: 'Teams', value: teamCount },
                  { label: 'Registered Players', value: playerCount },
                  { label: 'Games Played', value: league.gamesPlayed ?? 0 },
                  { label: 'Games Remaining', value: league.gamesRemaining ?? 0 },
                ].map((stat) => (
                  <div key={stat.label} className="flex justify-between">
                    <span className="text-sm text-gray-400">{stat.label}</span>
                    <span className="text-sm font-bold text-white">{stat.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-bold text-white mb-4">Divisions</h3>
              {league.divisions?.length > 0 ? (
                <div className="space-y-2">
                  {league.divisions.map((div: any) => (
                    <div key={div.id} className="flex items-center gap-2 py-2 border-b border-white/[0.06] last:border-0">
                      <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                      <span className="text-sm text-gray-300">{div.name}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-4">No divisions yet.</p>
              )}
            </Card>
          </div>
        </div>
      </div>

      {league && (
        <CreateSeasonModal
          isOpen={seasonModalOpen}
          onClose={() => setSeasonModalOpen(false)}
          leagueId={league.id}
          slug={slug}
          onCreated={() => {
            setSeasonModalOpen(false);
            // Reload league data
            fetch(`/api/leagues/${slug}`).then(r => r.json()).then(json => { if (json.data) setLeague(json.data); });
          }}
        />
      )}
    </div>
  );
}

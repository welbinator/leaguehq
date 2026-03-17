'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LeagueNav } from '@/components/league/LeagueNav';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { CreateSeasonModal } from '@/components/league/CreateSeasonModal';
import { EditSeasonModal } from '@/components/league/EditSeasonModal';

type TabFilter = 'current' | 'upcoming' | 'past';

interface SeasonDivision {
  id: string;
  divisionId: string;
  price: string | number;
  pricingType: 'PER_PLAYER' | 'PER_TEAM';
  division: { id: string; name: string };
}

interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  registrationOpen: boolean;
  paymentRequired: boolean;
  paymentDueDate: string | null;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED';
  seasonDivisions: SeasonDivision[];
}

interface SeasonsPageProps {
  params: { slug: string };
}

function statusBadge(season: Season) {
  if (season.registrationOpen) return <Badge variant="success" dot>Registration Open</Badge>;
  if (season.status === 'ACTIVE') return <Badge variant="success" dot>Active</Badge>;
  if (season.status === 'UPCOMING') return <Badge variant="default" dot>Upcoming</Badge>;
  return <Badge variant="default">Completed</Badge>;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function priceLabel(season: Season) {
  if (!season.paymentRequired) return 'Free';
  if (!season.seasonDivisions?.length) return 'Paid';
  const prices = season.seasonDivisions.map(sd => parseFloat(String(sd.price)) || 0);
  const min = Math.min(...prices);
  const per = season.seasonDivisions[0].pricingType === 'PER_PLAYER' ? 'player' : 'team';
  if (season.seasonDivisions.length > 1) return `$${min}+ / ${per}`;
  return `$${min} / ${per}`;
}

function classifySeasons(seasons: Season[]) {
  const now = new Date();
  const current: Season[] = [];
  const upcoming: Season[] = [];
  const past: Season[] = [];

  for (const s of seasons) {
    const start = new Date(s.startDate);
    const end = new Date(s.endDate);
    if (s.status === 'COMPLETED' || end < now) {
      past.push(s);
    } else if (s.status === 'UPCOMING' && start > now) {
      upcoming.push(s);
    } else {
      current.push(s);
    }
  }

  return { current, upcoming, past };
}

export default function SeasonsPage({ params }: SeasonsPageProps) {
  const { slug } = params;
  const [league, setLeague] = useState<any>(null);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabFilter>('current');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2500); }

  async function loadData() {
    try {
      const leagueRes = await fetch(`/api/leagues/${slug}`);
      const leagueJson = await leagueRes.json();
      if (leagueJson.error) throw new Error(leagueJson.error);
      const l = leagueJson.data;
      setLeague(l);

      const seasonsRes = await fetch(`/api/seasons?leagueId=${l.id}`);
      const seasonsJson = await seasonsRes.json();
      if (seasonsJson.data) setSeasons(seasonsJson.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [slug]);

  const { current, upcoming, past } = classifySeasons(seasons);

  const tabSeasons: Record<TabFilter, Season[]> = { current, upcoming, past };

  const tabs: { key: TabFilter; label: string; count: number }[] = [
    { key: 'current', label: 'Current', count: current.length },
    { key: 'upcoming', label: 'Upcoming', count: upcoming.length },
    { key: 'past', label: 'Past', count: past.length },
  ];

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
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-gray-400 mb-4">{error ?? 'League not found.'}</p>
          <Link href="/dashboard" className="text-accent hover:underline text-sm">← Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const displayed = tabSeasons[tab];

  return (
    <div className="min-h-screen bg-navy">
      <LeagueNav slug={slug} />

      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-accent text-navy font-semibold px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in">
          {toast}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white">Seasons</h1>
            <p className="text-gray-400 text-sm mt-0.5">{seasons.length} season{seasons.length !== 1 ? 's' : ''} total</p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>+ New Season</Button>
        </div>

        {/* Tab Filter */}
        <div className="flex gap-1 bg-surface rounded-xl p-1 mb-6 w-fit">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t.key
                  ? 'bg-accent text-navy shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t.label}
              {t.count > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${tab === t.key ? 'bg-navy/30 text-navy' : 'bg-white/10 text-gray-300'}`}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Season List */}
        {displayed.length === 0 ? (
          <Card>
            <div className="text-center py-10">
              <div className="text-4xl mb-3">
                {tab === 'current' ? '🏈' : tab === 'upcoming' ? '📅' : '📦'}
              </div>
              <p className="text-gray-400 text-sm mb-4">
                {tab === 'current'
                  ? 'No active seasons right now.'
                  : tab === 'upcoming'
                  ? 'No upcoming seasons scheduled.'
                  : 'No past seasons yet.'}
              </p>
              {tab === 'current' && (
                <button onClick={() => setCreateOpen(true)} className="text-accent text-sm hover:underline">
                  Create a season →
                </button>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {displayed.map(season => (
              <Card key={season.id}>
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h2 className="text-lg font-bold text-white">{season.name}</h2>
                      {statusBadge(season)}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-6 gap-y-2 text-sm">
                      <div>
                        <span className="text-gray-500 block text-xs uppercase tracking-wide mb-0.5">Start</span>
                        <span className="text-gray-200">{formatDate(season.startDate)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs uppercase tracking-wide mb-0.5">End</span>
                        <span className="text-gray-200">{formatDate(season.endDate)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs uppercase tracking-wide mb-0.5">Fee</span>
                        <span className="text-accent font-semibold">{priceLabel(season)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block text-xs uppercase tracking-wide mb-0.5">Divisions</span>
                        <span className="text-gray-200">
                          {season.seasonDivisions.length === 0
                            ? '—'
                            : season.seasonDivisions.length === 1 && season.seasonDivisions[0].division.name === 'General'
                            ? 'General'
                            : season.seasonDivisions.map(sd => sd.division.name).join(', ')}
                        </span>
                      </div>
                    </div>

                    {season.paymentDueDate && !season.paymentRequired && (
                      <p className="text-xs text-yellow-400 mt-2">
                        💰 Payment due {formatDate(season.paymentDueDate)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(`${window.location.origin}/register/${slug}/${season.id}`);
                        showToast('Registration link copied!');
                      }}
                      className="text-xs text-gray-400 hover:text-accent border border-white/10 hover:border-accent/30 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Copy Link
                    </button>
                    <button
                      onClick={() => setEditingSeason(season)}
                      className="text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {league && (
        <CreateSeasonModal
          isOpen={createOpen}
          onClose={() => setCreateOpen(false)}
          leagueId={league.id}
          slug={slug}
          onCreated={() => {
            setCreateOpen(false);
            loadData();
          }}
        />
      )}

      {/* Edit Modal */}
      {editingSeason && (
        <EditSeasonModal
          isOpen={!!editingSeason}
          onClose={() => setEditingSeason(null)}
          season={editingSeason}
          onSaved={(updated) => {
            setSeasons(ss => ss.map(s => s.id === updated.id ? updated : s));
            setEditingSeason(null);
            showToast('Season updated!');
          }}
        />
      )}
    </div>
  );
}

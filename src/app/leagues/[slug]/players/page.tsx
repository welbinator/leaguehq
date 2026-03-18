'use client';

import { useEffect, useState } from 'react';
import { LeagueNav } from '@/components/league/LeagueNav';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface Registration {
  id: string;
  teamName: string;
  captainName: string;
  captainEmail: string;
  captainPhone: string | null;
  status: string;
  notes: string | null;
  createdAt: string;
  season: { id: string; name: string };
  seasonDivision: { division: { name: string } } | null;
}

export default function PlayersPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('ALL');
  const [seasons, setSeasons] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    async function load() {
      const leagueRes = await fetch(`/api/leagues/${slug}`);
      const leagueJson = await leagueRes.json();
      if (!leagueJson.data) return;
      const leagueId = leagueJson.data.id;

      const regRes = await fetch(`/api/team-registrations?leagueId=${leagueId}&status=APPROVED`);
      const regJson = await regRes.json();
      const regs: Registration[] = regJson.data ?? [];
      setRegistrations(regs);

      // Extract unique seasons
      const seen = new Map<string, string>();
      regs.forEach(r => { if (!seen.has(r.season.id)) seen.set(r.season.id, r.season.name); });
      setSeasons(Array.from(seen.entries()).map(([id, name]) => ({ id, name })));
      setLoading(false);
    }
    load();
  }, [slug]);

  const filtered = registrations.filter(r => {
    const matchesSeason = seasonFilter === 'ALL' || r.season.id === seasonFilter;
    const matchesSearch = !search || 
      r.captainName.toLowerCase().includes(search.toLowerCase()) ||
      r.captainEmail.toLowerCase().includes(search.toLowerCase()) ||
      r.teamName.toLowerCase().includes(search.toLowerCase());
    return matchesSeason && matchesSearch;
  });

  const statusVariant: Record<string, 'warning' | 'success' | 'danger' | 'default'> = {
    PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger',
  };

  return (
    <div className="min-h-screen bg-navy">
      <LeagueNav slug={slug} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-black text-white">Players</h1>
            <p className="text-gray-400 text-sm mt-0.5">{filtered.length} registered player{filtered.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6 flex-wrap">
          <input
            type="text"
            placeholder="Search by name, email, or team..."
            className="flex-1 min-w-[200px] bg-surface border border-white/10 rounded-lg text-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder-gray-500"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {seasons.length > 1 && (
            <select
              className="bg-surface border border-white/10 rounded-lg text-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              value={seasonFilter}
              onChange={e => setSeasonFilter(e.target.value)}
            >
              <option value="ALL">All Seasons</option>
              {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <div className="text-center py-10">
              <div className="text-4xl mb-3">👥</div>
              <p className="text-gray-400 text-sm">
                {search ? 'No players match your search.' : 'No approved registrations yet.'}
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(reg => (
              <Card key={reg.id}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1.5">
                      <span className="text-white font-semibold">{reg.captainName}</span>
                      {reg.seasonDivision && (
                        <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
                          {reg.seasonDivision.division.name}
                        </span>
                      )}
                      <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">
                        {reg.teamName}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <a href={`mailto:${reg.captainEmail}`} className="text-accent hover:underline truncate max-w-[220px]">
                        {reg.captainEmail}
                      </a>
                      {reg.captainPhone && (
                        <a href={`tel:${reg.captainPhone}`} className="text-gray-400 hover:text-white">
                          {reg.captainPhone}
                        </a>
                      )}
                      <span className="text-gray-500 text-xs">{reg.season.name}</span>
                    </div>
                    {reg.notes && (
                      <p className="text-xs text-gray-500 mt-1.5 bg-white/5 rounded-lg px-3 py-1.5">{reg.notes}</p>
                    )}
                  </div>
                  <div className="text-xs text-gray-500 flex-shrink-0">
                    {new Date(reg.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

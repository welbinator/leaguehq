'use client';

import { useEffect, useState } from 'react';
import { LeagueNav } from '@/components/league/LeagueNav';
import { Card } from '@/components/ui/Card';

interface PlayerRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: 'Captain' | 'Player';
  teamName: string;
  division: string | null;
  season: string;
  seasonId: string;
  createdAt: string;
}

export default function PlayersPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [players, setPlayers] = useState<PlayerRow[]>([]);
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

      const [regRes, playerRes] = await Promise.all([
        fetch(`/api/team-registrations?leagueId=${leagueId}`),
        fetch(`/api/player-registrations?leagueId=${leagueId}`),
      ]);
      const [regJson, playerJson] = await Promise.all([regRes.json(), playerRes.json()]);

      const captains: PlayerRow[] = (regJson.data ?? []).map((r: any) => ({
        id: r.id,
        name: r.captainName,
        email: r.captainEmail,
        phone: r.captainPhone,
        role: 'Captain' as const,
        teamName: r.teamName,
        division: r.seasonDivision?.division?.name ?? null,
        season: r.season.name,
        seasonId: r.season.id,
        createdAt: r.createdAt,
      }));

      const playerMembers: PlayerRow[] = (playerJson.data ?? []).map((r: any) => ({
        id: r.id,
        name: r.playerName,
        email: r.playerEmail,
        phone: r.playerPhone,
        role: 'Player' as const,
        teamName: r.teamRegistration?.teamName ?? 'No Team',
        division: r.seasonDivision?.division?.name ?? null,
        season: r.season.name,
        seasonId: r.season.id,
        createdAt: r.createdAt,
      }));

      const all = [...captains, ...playerMembers].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setPlayers(all);

      const seen = new Map<string, string>();
      all.forEach(r => { if (!seen.has(r.seasonId)) seen.set(r.seasonId, r.season); });
      setSeasons(Array.from(seen.entries()).map(([id, name]) => ({ id, name })));
      setLoading(false);
    }
    load();
  }, [slug]);

  const filtered = players.filter(p => {
    const matchesSeason = seasonFilter === 'ALL' || p.seasonId === seasonFilter;
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.teamName.toLowerCase().includes(search.toLowerCase());
    return matchesSeason && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-navy">
      <LeagueNav slug={slug} />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Players</h1>
          <p className="text-gray-400 text-sm mt-0.5">{filtered.length} player{filtered.length !== 1 ? 's' : ''}</p>
        </div>

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
              className="bg-surface border border-white/10 rounded-lg text-white px-4 py-2 text-sm focus:outline-none"
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
              <p className="text-gray-400 text-sm">{search ? 'No players match your search.' : 'No players yet.'}</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(p => (
              <Card key={p.role + p.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1.5">
                      <span className="text-white font-semibold">{p.name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.role === 'Captain' ? 'bg-accent/15 text-accent' : 'bg-white/8 text-gray-400'}`}>
                        {p.role}
                      </span>
                      <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{p.teamName}</span>
                      {p.division && (
                        <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">{p.division}</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <a href={`mailto:${p.email}`} className="text-accent hover:underline truncate max-w-[220px]">{p.email}</a>
                      {p.phone && <a href={`tel:${p.phone}`} className="text-gray-400 hover:text-white">{p.phone}</a>}
                      <span className="text-gray-500 text-xs">{p.season}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 flex-shrink-0">
                    {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
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

'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

interface PlayerRow {
  id: string;
  type: 'captain' | 'player';
  name: string;
  email: string;
  phone: string | null;
  role: 'Captain' | 'Player';
  teamName: string;
  teamRegistrationId: string | null;
  division: string | null;
  season: string;
  seasonId: string;
  seasonStatus: string;
  createdAt: string;
}

interface TeamOption {
  id: string;
  teamName: string;
  seasonId: string;
}

type StatusFilter = 'active' | 'all';

const inputCls = 'w-full bg-navy border border-white/10 rounded-lg text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder-gray-500 appearance-none';
const labelCls = 'block text-sm font-medium text-gray-300 mb-1.5';

export default function PlayersPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [seasons, setSeasons] = useState<{ id: string; name: string; status: string }[]>([]);
  const [leagueId, setLeagueId] = useState('');
  const [isDirector, setIsDirector] = useState(false);

  // Edit modal
  const [editing, setEditing] = useState<PlayerRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editTeamId, setEditTeamId] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [toast, setToast] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  async function load() {
    const [leagueRes, accountRes] = await Promise.all([
      fetch(`/api/leagues/${slug}`),
      fetch('/api/account'),
    ]);
    const [leagueJson, accountJson] = await Promise.all([leagueRes.json(), accountRes.json()]);
    if (!leagueJson.data) return;
    const lid = leagueJson.data.id;
    setLeagueId(lid);
    const currentUserId = accountJson?.data?.id ?? null;
    setIsDirector(!!currentUserId && leagueJson.data.ownerId === currentUserId);

    // Use canonical Registration table
    const [regRes, seasonsRes, teamsRes] = await Promise.all([
      fetch(`/api/registrations?leagueId=${lid}`),
      fetch(`/api/seasons?leagueId=${lid}`),
      fetch(`/api/leagues/${slug}/teams-list`).catch(() => ({ json: async () => ({ data: [] }) })),
    ]);
    const [regJson, seasonsJson] = await Promise.all([regRes.json(), seasonsRes.json()]);

    // Build season list
    const seasonList: { id: string; name: string; status: string }[] = (seasonsJson.data ?? []).map((s: any) => ({
      id: s.id, name: s.name, status: s.status,
    }));
    setSeasons(seasonList);

    // Build team options from registrations (unique teams)
    const teamMap = new Map<string, TeamOption>();
    for (const r of (regJson.data ?? [])) {
      if (r.team) teamMap.set(r.team.id, { id: r.team.id, teamName: r.team.name, seasonId: r.seasonId });
    }
    setTeams(Array.from(teamMap.values()));

    // Map registrations to PlayerRow
    const rows: PlayerRow[] = (regJson.data ?? []).map((r: any) => ({
      id: r.id,
      type: 'player' as const,
      name: r.user?.name ?? r.user?.email ?? 'Unknown',
      email: r.user?.email ?? '',
      phone: r.user?.phone ?? null,
      role: 'Player' as const,
      teamName: r.team?.name ?? 'No Team',
      teamRegistrationId: r.teamId ?? null,
      division: null,
      season: r.season?.name ?? '',
      seasonId: r.season?.id ?? '',
      seasonStatus: r.season?.status ?? 'UPCOMING',
      createdAt: r.createdAt,
    })).sort((a: PlayerRow, b: PlayerRow) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    setPlayers(rows);
    setLoading(false);
  }

  useEffect(() => { load(); }, [slug]);

  function openEdit(p: PlayerRow) {
    setEditing(p);
    setEditName(p.name);
    setEditEmail(p.email);
    setEditPhone(p.phone ?? '');
    setEditTeamId(p.teamRegistrationId ?? '');
    setSaveError('');
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setSaveError('');
    try {
      // All registrations use the same Registration model now
      const res = await fetch(`/api/registrations/${editing.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: editTeamId || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setSaveError(json.error ?? 'Save failed'); return; }
      setEditing(null);
      showToast('Player updated');
      await load();
    } catch {
      setSaveError('Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  // Determine which seasons are "active" (ACTIVE or UPCOMING)
  const activeSeasonIds = new Set(
    seasons.filter(s => s.status === 'ACTIVE' || s.status === 'UPCOMING').map(s => s.id)
  );

  const filtered = players.filter(p => {
    const matchesStatus = statusFilter === 'all' || activeSeasonIds.has(p.seasonId);
    const matchesSeason = seasonFilter === 'ALL' || p.seasonId === seasonFilter;
    const matchesSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.teamName.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSeason && matchesSearch;
  });

  // All teams in the league are available for assignment
  const teamsForSeason = teams;

  return (
    <div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-accent text-navy font-semibold px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Players</h1>
          <p className="text-gray-400 text-sm mt-0.5">{filtered.length} player{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Filters */}
        <div className="space-y-3 mb-6">
          {/* Status tabs */}
          <div className="flex gap-1 bg-surface rounded-xl p-1 w-fit">
            {([
              { key: 'active', label: 'Current & Upcoming' },
              { key: 'all', label: 'All Seasons' },
            ] as { key: StatusFilter; label: string }[]).map(tab => (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  statusFilter === tab.key ? 'bg-accent text-navy shadow' : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              placeholder="Search by name, email, or team..."
              className="flex-1 min-w-[200px] bg-surface border border-white/10 rounded-lg text-white px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder-gray-500"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {seasons.length > 1 && (
              <select
                className="bg-surface border border-white/10 rounded-lg text-white px-4 py-2 text-sm focus:outline-none appearance-none"
                value={seasonFilter}
                onChange={e => setSeasonFilter(e.target.value)}
              >
                <option value="ALL" className="bg-navy">All Seasons</option>
                {seasons.map(s => (
                  <option key={s.id} value={s.id} className="bg-navy">
                    {s.name} {s.status === 'ACTIVE' ? '(Active)' : s.status === 'UPCOMING' ? '(Upcoming)' : '(Past)'}
                  </option>
                ))}
              </select>
            )}
          </div>
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
              <Card key={p.type + p.id}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-1.5">
                      <span className="text-white font-semibold">{p.name}</span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${p.role === 'Captain' ? 'bg-accent/15 text-accent' : 'bg-white/8 text-gray-400'}`}>
                        {p.role}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${p.teamName === 'No Team' ? 'bg-red-500/10 text-red-400' : 'bg-white/5 text-gray-400'}`}>
                        {p.teamName}
                      </span>
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
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs text-gray-500">
                      {new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                    {isDirector && (
                    <button
                      onClick={() => openEdit(p)}
                      className="text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all"
                    >
                      Edit
                    </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Edit Player Modal */}
      {editing && (
        <Modal
          isOpen={!!editing}
          onClose={() => setEditing(null)}
          title={`Edit ${editing.role}`}
          footer={
            <>
              <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
              <Button type="submit" form="edit-player-form" loading={saving}>Save Changes</Button>
            </>
          }
        >
          <form id="edit-player-form" onSubmit={handleSave} className="space-y-4">
            <div>
              <label className={labelCls}>Full Name</label>
              <input className={inputCls} value={editName} onChange={e => setEditName(e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input className={inputCls} type="email" value={editEmail} onChange={e => setEditEmail(e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Phone</label>
              <input className={inputCls} type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} placeholder="Optional" />
            </div>

            {/* Team assignment — only for players, not captains */}
            {editing.type === 'player' && (
              <div>
                <label className={labelCls}>Team</label>
                {teamsForSeason.length === 0 ? (
                  <p className="text-sm text-gray-500 bg-white/5 rounded-lg px-4 py-3">
                    No teams registered for {editing.season} yet. Create a team registration first.
                  </p>
                ) : (
                  <select
                    className={inputCls}
                    value={editTeamId}
                    onChange={e => setEditTeamId(e.target.value)}
                  >
                    <option value="" className="bg-navy">— No Team —</option>
                    {teamsForSeason.map(t => (
                      <option key={t.id} value={t.id} className="bg-navy">{t.teamName}</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {saveError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">{saveError}</div>
            )}
          </form>
        </Modal>
      )}
    </div>
  );
}

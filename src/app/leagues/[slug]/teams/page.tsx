'use client';

import { useEffect, useState } from 'react';
import { LeagueNav } from '@/components/league/LeagueNav';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

interface SeasonDivision {
  id: string;
  division: { name: string };
}

interface Season {
  id: string;
  name: string;
  status: string;
  seasonDivisions: SeasonDivision[];
}

interface TeamReg {
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

const inputCls = 'w-full bg-navy border border-white/10 rounded-lg text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder-gray-500 appearance-none';
const labelCls = 'block text-sm font-medium text-gray-300 mb-1.5';

export default function TeamsPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<TeamReg[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [updating, setUpdating] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Create team modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newCaptainName, setNewCaptainName] = useState('');
  const [newCaptainEmail, setNewCaptainEmail] = useState('');
  const [newCaptainPhone, setNewCaptainPhone] = useState('');
  const [newSeasonId, setNewSeasonId] = useState('');
  const [newDivisionId, setNewDivisionId] = useState('');
  const [newAutoApprove, setNewAutoApprove] = useState(true);
  const [newNotes, setNewNotes] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  async function loadData() {
    const leagueRes = await fetch(`/api/leagues/${slug}`);
    const leagueJson = await leagueRes.json();
    if (leagueJson.error) return;
    const id = leagueJson.data.id;
    setLeagueId(id);

    const [regRes, seasonRes] = await Promise.all([
      fetch(`/api/team-registrations?leagueId=${id}`),
      fetch(`/api/seasons?leagueId=${id}`),
    ]);
    const [regJson, seasonJson] = await Promise.all([regRes.json(), seasonRes.json()]);
    setRegistrations(regJson.data ?? []);
    const seasonList: Season[] = seasonJson.data ?? [];
    setSeasons(seasonList);

    // Default season selector to first active/upcoming season
    const defaultSeason = seasonList.find(s => s.status === 'ACTIVE' || s.status === 'UPCOMING') ?? seasonList[0];
    if (defaultSeason) setNewSeasonId(defaultSeason.id);

    setLoading(false);
  }

  useEffect(() => { loadData(); }, [slug]);

  // When season changes in modal, reset division
  const selectedSeason = seasons.find(s => s.id === newSeasonId);
  useEffect(() => {
    if (selectedSeason?.seasonDivisions?.length === 1) {
      setNewDivisionId(selectedSeason.seasonDivisions[0].id);
    } else {
      setNewDivisionId('');
    }
  }, [newSeasonId]);

  async function updateStatus(id: string, status: string) {
    setUpdating(id);
    const res = await fetch(`/api/team-registrations?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const json = await res.json();
    if (json.data) {
      setRegistrations(regs => regs.map(r => r.id === id ? { ...r, status: json.data.status } : r));
      showToast(`Team ${status.toLowerCase()}`);
    }
    setUpdating(null);
  }

  function resetCreateForm() {
    setNewTeamName(''); setNewCaptainName(''); setNewCaptainEmail('');
    setNewCaptainPhone(''); setNewDivisionId(''); setNewAutoApprove(true);
    setNewNotes(''); setCreateError('');
    const defaultSeason = seasons.find(s => s.status === 'ACTIVE' || s.status === 'UPCOMING') ?? seasons[0];
    if (defaultSeason) setNewSeasonId(defaultSeason.id);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim() || !newCaptainName.trim() || !newCaptainEmail.trim() || !newSeasonId) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId: newSeasonId,
          seasonDivisionId: newDivisionId || null,
          isCaptain: true,
          teamName: newTeamName.trim(),
          playerName: newCaptainName.trim(),
          playerEmail: newCaptainEmail.trim(),
          playerPhone: newCaptainPhone || null,
          notes: newNotes || null,
          // Director-created teams bypass the userId requirement
          userId: null,
          directorCreated: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) { setCreateError(json.message ?? json.error ?? 'Failed to create team'); return; }

      // Auto-approve if toggled
      if (newAutoApprove && json.data?.id) {
        await fetch(`/api/team-registrations?id=${json.data.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'APPROVED' }),
        });
      }

      setCreateOpen(false);
      resetCreateForm();
      showToast('Team created!');
      await loadData();
    } catch {
      setCreateError('Something went wrong');
    } finally {
      setCreating(false);
    }
  }

  const filtered = filter === 'ALL' ? registrations : registrations.filter(r => r.status === filter);
  const counts = {
    ALL: registrations.length,
    PENDING: registrations.filter(r => r.status === 'PENDING').length,
    APPROVED: registrations.filter(r => r.status === 'APPROVED').length,
    REJECTED: registrations.filter(r => r.status === 'REJECTED').length,
  };

  const statusVariant: Record<string, 'warning' | 'success' | 'danger' | 'default'> = {
    PENDING: 'warning',
    APPROVED: 'success',
    REJECTED: 'danger',
  };

  return (
    <div className="min-h-screen bg-navy">
      <LeagueNav slug={slug} />

      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-accent text-navy font-semibold px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white">Team Registrations</h1>
            <p className="text-gray-400 text-sm mt-0.5">{registrations.length} registration{registrations.length !== 1 ? 's' : ''} total</p>
          </div>
          <Button onClick={() => { resetCreateForm(); setCreateOpen(true); }}>+ Add Team</Button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-surface rounded-xl p-1 mb-6 overflow-x-auto w-full sm:w-fit">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                filter === f ? 'bg-accent text-navy shadow' : 'text-gray-400 hover:text-white'
              }`}
            >
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
              {counts[f] > 0 && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${filter === f ? 'bg-navy/30 text-navy' : 'bg-white/10 text-gray-300'}`}>
                  {counts[f]}
                </span>
              )}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <div className="text-center py-10">
              <div className="text-4xl mb-3">🏆</div>
              <p className="text-gray-400 text-sm mb-4">
                {filter === 'ALL' ? 'No registrations yet.' : `No ${filter.toLowerCase()} registrations.`}
              </p>
              {filter === 'ALL' && (
                <button onClick={() => { resetCreateForm(); setCreateOpen(true); }} className="text-accent text-sm hover:underline">
                  Add a team manually →
                </button>
              )}
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {filtered.map(reg => (
              <Card key={reg.id}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap mb-2">
                      <h3 className="text-base font-bold text-white">{reg.teamName}</h3>
                      <Badge variant={statusVariant[reg.status] ?? 'default'} dot>
                        {reg.status.charAt(0) + reg.status.slice(1).toLowerCase()}
                      </Badge>
                      {reg.seasonDivision && (
                        <span className="text-xs text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">
                          {reg.seasonDivision.division.name}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-2 text-sm">
                      <div>
                        <span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Captain</span>
                        <span className="text-gray-200">{reg.captainName}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Email</span>
                        <a href={`mailto:${reg.captainEmail}`} className="text-accent hover:underline text-sm truncate block max-w-[160px]">{reg.captainEmail}</a>
                      </div>
                      {reg.captainPhone && (
                        <div>
                          <span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Phone</span>
                          <span className="text-gray-200">{reg.captainPhone}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Season</span>
                        <span className="text-gray-200">{reg.season.name}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 text-xs uppercase tracking-wide block mb-0.5">Registered</span>
                        <span className="text-gray-200">{new Date(reg.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>

                    {reg.notes && (
                      <p className="text-xs text-gray-400 mt-2 bg-white/5 rounded-lg px-3 py-2">{reg.notes}</p>
                    )}
                  </div>

                  {/* Actions */}
                  {reg.status === 'PENDING' && (
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => updateStatus(reg.id, 'APPROVED')}
                        disabled={updating === reg.id}
                        className="text-xs font-medium text-accent border border-accent/30 hover:bg-accent/10 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => updateStatus(reg.id, 'REJECTED')}
                        disabled={updating === reg.id}
                        className="text-xs font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                      >
                        Reject
                      </button>
                    </div>
                  )}
                  {reg.status === 'APPROVED' && (
                    <button
                      onClick={() => updateStatus(reg.id, 'REJECTED')}
                      disabled={updating === reg.id}
                      className="text-xs text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      Revoke
                    </button>
                  )}
                  {reg.status === 'REJECTED' && (
                    <button
                      onClick={() => updateStatus(reg.id, 'APPROVED')}
                      disabled={updating === reg.id}
                      className="text-xs text-gray-500 hover:text-accent transition-colors disabled:opacity-50 flex-shrink-0"
                    >
                      Re-approve
                    </button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => { setCreateOpen(false); resetCreateForm(); }}
        title="Add Team"
        footer={
          <>
            <Button variant="ghost" onClick={() => { setCreateOpen(false); resetCreateForm(); }}>Cancel</Button>
            <Button type="submit" form="create-team-form" loading={creating}>Create Team</Button>
          </>
        }
      >
        <form id="create-team-form" onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className={labelCls}>Team Name *</label>
            <input className={inputCls} value={newTeamName} onChange={e => setNewTeamName(e.target.value)} required placeholder="e.g. Thunder FC" />
          </div>

          <div className="border-t border-white/8 pt-4">
            <p className="text-xs text-gray-500 mb-3">Captain / Contact Info</p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Captain Name *</label>
                <input className={inputCls} value={newCaptainName} onChange={e => setNewCaptainName(e.target.value)} required placeholder="Full name" />
              </div>
              <div>
                <label className={labelCls}>Captain Email *</label>
                <input className={inputCls} type="email" value={newCaptainEmail} onChange={e => setNewCaptainEmail(e.target.value)} required placeholder="captain@email.com" />
              </div>
              <div>
                <label className={labelCls}>Captain Phone</label>
                <input className={inputCls} type="tel" value={newCaptainPhone} onChange={e => setNewCaptainPhone(e.target.value)} placeholder="Optional" />
              </div>
            </div>
          </div>

          <div className="border-t border-white/8 pt-4">
            <p className="text-xs text-gray-500 mb-3">Season & Division</p>
            <div className="space-y-3">
              <div>
                <label className={labelCls}>Season *</label>
                {seasons.length === 0 ? (
                  <p className="text-sm text-gray-500">No seasons found. Create a season first.</p>
                ) : (
                  <select className={inputCls} value={newSeasonId} onChange={e => setNewSeasonId(e.target.value)} required>
                    <option value="" className="bg-navy">Select a season…</option>
                    {seasons.map(s => (
                      <option key={s.id} value={s.id} className="bg-navy">{s.name}</option>
                    ))}
                  </select>
                )}
              </div>

              {selectedSeason && selectedSeason.seasonDivisions.length > 1 && (
                <div>
                  <label className={labelCls}>Division</label>
                  <select className={inputCls} value={newDivisionId} onChange={e => setNewDivisionId(e.target.value)}>
                    <option value="" className="bg-navy">— No division —</option>
                    {selectedSeason.seasonDivisions.map(sd => (
                      <option key={sd.id} value={sd.id} className="bg-navy">{sd.division.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes</label>
            <textarea className={inputCls + ' resize-none'} rows={2} value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Optional notes" />
          </div>

          {/* Auto-approve toggle */}
          <div
            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${newAutoApprove ? 'border-accent bg-accent/5' : 'border-white/10'}`}
            onClick={() => setNewAutoApprove(v => !v)}
          >
            <div>
              <div className="text-sm font-medium text-white">Auto-approve this team</div>
              <div className="text-xs text-gray-400 mt-0.5">Skip the pending state and mark as approved immediately</div>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${newAutoApprove ? 'bg-accent' : 'bg-white/10'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${newAutoApprove ? 'left-5' : 'left-1'}`} />
            </div>
          </div>

          {createError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">{createError}</div>
          )}
        </form>
      </Modal>
    </div>
  );
}

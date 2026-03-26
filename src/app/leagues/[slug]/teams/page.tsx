'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface SeasonEnrollment {
  id: string;
  status: string;
  notes: string | null;
  season: { id: string; name: string; status: string };
  seasonDivision: { id: string; division: { id: string; name: string } } | null;
}

interface Team {
  id: string;
  name: string;
  leagueId: string;
  createdAt: string;
  seasonEnrollments: SeasonEnrollment[];
}

interface Season {
  id: string;
  name: string;
  status: string;
  seasonDivisions: { id: string; division: { id: string; name: string } }[];
}

const inputCls = 'w-full bg-navy border border-white/10 rounded-lg text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder-gray-500 appearance-none';
const labelCls = 'block text-sm font-medium text-gray-300 mb-1.5';

export default function TeamsPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [leagueId, setLeagueId] = useState('');
  const [isDirector, setIsDirector] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null);
  const [updatingEnrollment, setUpdatingEnrollment] = useState<string | null>(null);

  // Create team modal
  const [createOpen, setCreateOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Enroll modal
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollTeam, setEnrollTeam] = useState<Team | null>(null);
  const [enrollSeasonId, setEnrollSeasonId] = useState('');
  const [enrollDivisionId, setEnrollDivisionId] = useState('');
  const [enrollAutoApprove, setEnrollAutoApprove] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [enrollError, setEnrollError] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000); }

  async function loadData() {
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

    const [teamsRes, seasonsRes] = await Promise.all([
      fetch(`/api/teams?leagueId=${lid}`),
      fetch(`/api/seasons?leagueId=${lid}`),
    ]);
    const [teamsJson, seasonsJson] = await Promise.all([teamsRes.json(), seasonsRes.json()]);
    setTeams(teamsJson.data ?? []);
    setSeasons(seasonsJson.data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [slug]);

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    setCreating(true);
    setCreateError('');
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName.trim(), leagueId }),
      });
      const json = await res.json();
      if (!res.ok) { setCreateError(json.error ?? 'Failed to create team'); return; }
      setCreateOpen(false);
      setNewTeamName('');
      showToast('Team created!');
      await loadData();
    } catch { setCreateError('Something went wrong'); }
    finally { setCreating(false); }
  }

  function openEnroll(team: Team) {
    setEnrollTeam(team);
    const defaultSeason = seasons.find(s => s.status === 'ACTIVE' || s.status === 'UPCOMING') ?? seasons[0];
    setEnrollSeasonId(defaultSeason?.id ?? '');
    setEnrollDivisionId('');
    setEnrollAutoApprove(true);
    setEnrollError('');
    setEnrollOpen(true);
  }

  const enrollSelectedSeason = seasons.find(s => s.id === enrollSeasonId);

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault();
    if (!enrollTeam || !enrollSeasonId) return;
    setEnrolling(true);
    setEnrollError('');
    try {
      const res = await fetch('/api/season-enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: enrollTeam.id,
          seasonId: enrollSeasonId,
          seasonDivisionId: enrollDivisionId || null,
          status: enrollAutoApprove ? 'APPROVED' : 'PENDING',
        }),
      });
      const json = await res.json();
      if (!res.ok && res.status !== 409) { setEnrollError(json.error ?? 'Failed to enroll'); return; }
      setEnrollOpen(false);
      showToast(`${enrollTeam.name} enrolled!`);
      await loadData();
    } catch { setEnrollError('Something went wrong'); }
    finally { setEnrolling(false); }
  }

  async function updateEnrollmentStatus(enrollmentId: string, status: string) {
    setUpdatingEnrollment(enrollmentId);
    const res = await fetch(`/api/season-enrollments?id=${enrollmentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      showToast(`Team ${status.toLowerCase()}`);
      await loadData();
    }
    setUpdatingEnrollment(null);
  }

  const statusVariant: Record<string, 'warning' | 'success' | 'danger' | 'default'> = {
    PENDING: 'warning', APPROVED: 'success', REJECTED: 'danger',
  };

  return (
    <div>

      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-accent text-navy font-semibold px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-white">Teams</h1>
            <p className="text-gray-400 text-sm mt-0.5">{teams.length} team{teams.length !== 1 ? 's' : ''} in this league</p>
          </div>
          {isDirector && <Button onClick={() => { setNewTeamName(''); setCreateError(''); setCreateOpen(true); }}>+ Add Team</Button>}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : teams.length === 0 ? (
          <Card>
            <div className="text-center py-10">
              <div className="text-4xl mb-3">🏆</div>
              <p className="text-gray-400 text-sm mb-4">No teams yet. Add one manually or share your registration link.</p>
              <button onClick={() => { setNewTeamName(''); setCreateError(''); setCreateOpen(true); }} className="text-accent text-sm hover:underline">
                Add a team →
              </button>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {teams.map(team => {
              const isExpanded = expandedTeam === team.id;
              const activeEnrollments = team.seasonEnrollments.filter(e => e.season.status !== 'COMPLETED');
              return (
                <Card key={team.id}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="text-base font-bold text-white">{team.name}</h3>
                        {activeEnrollments.length > 0 ? (
                          <span className="text-xs text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                            {activeEnrollments.length} active season{activeEnrollments.length !== 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded-full">No active seasons</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Created {new Date(team.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        {team.seasonEnrollments.length > 0 && ` · ${team.seasonEnrollments.length} season enrollment${team.seasonEnrollments.length !== 1 ? 's' : ''} total`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {team.seasonEnrollments.length > 0 && (
                        <button
                          onClick={() => setExpandedTeam(isExpanded ? null : team.id)}
                          className="text-xs text-gray-400 hover:text-white border border-white/10 hover:border-white/20 px-3 py-1.5 rounded-lg transition-all"
                        >
                          {isExpanded ? 'Hide' : 'Seasons'}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Season enrollments expanded */}
                  {isExpanded && team.seasonEnrollments.length > 0 && (
                    <div className="mt-4 border-t border-white/8 pt-4 space-y-2">
                      {team.seasonEnrollments.map(e => (
                        <div key={e.id} className="flex items-center justify-between gap-3 bg-navy rounded-lg px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-white font-medium">{e.season.name}</span>
                            <Badge variant={statusVariant[e.status] ?? 'default'} dot>
                              {e.status.charAt(0) + e.status.slice(1).toLowerCase()}
                            </Badge>
                            {e.seasonDivision && (
                              <span className="text-xs text-gray-400">{e.seasonDivision.division.name}</span>
                            )}
                          </div>
                          {isDirector && (
                          <div className="flex gap-2">
                            {e.status === 'PENDING' && (
                              <>
                                <button
                                  onClick={() => updateEnrollmentStatus(e.id, 'APPROVED')}
                                  disabled={updatingEnrollment === e.id}
                                  className="text-xs font-medium text-accent border border-accent/30 hover:bg-accent/10 px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
                                >Approve</button>
                                <button
                                  onClick={() => updateEnrollmentStatus(e.id, 'REJECTED')}
                                  disabled={updatingEnrollment === e.id}
                                  className="text-xs font-medium text-red-400 border border-red-500/20 hover:bg-red-500/10 px-2.5 py-1 rounded-lg transition-all disabled:opacity-50"
                                >Reject</button>
                              </>
                            )}
                            {e.status === 'APPROVED' && (
                              <button
                                onClick={() => updateEnrollmentStatus(e.id, 'REJECTED')}
                                disabled={updatingEnrollment === e.id}
                                className="text-xs text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
                              >Revoke</button>
                            )}
                            {e.status === 'REJECTED' && (
                              <button
                                onClick={() => updateEnrollmentStatus(e.id, 'APPROVED')}
                                disabled={updatingEnrollment === e.id}
                                className="text-xs text-gray-500 hover:text-accent transition-colors disabled:opacity-50"
                              >Re-approve</button>
                            )}
                          </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Team Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Add Team"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" form="create-team-form" loading={creating}>Create Team</Button>
          </>
        }
      >
        <form id="create-team-form" onSubmit={handleCreateTeam} className="space-y-4">
          <div>
            <label className={labelCls}>Team Name *</label>
            <input
              className={inputCls}
              value={newTeamName}
              onChange={e => setNewTeamName(e.target.value)}
              required
              placeholder="e.g. Thunder FC"
              autoFocus
            />
          </div>
          <p className="text-xs text-gray-500">
            The team will be added to this league's roster. You can enroll them in a specific season afterward.
          </p>
          {createError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">{createError}</div>
          )}
        </form>
      </Modal>

      {/* Enroll in Season Modal */}
      <Modal
        isOpen={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        title={`Enroll ${enrollTeam?.name ?? 'Team'} in Season`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEnrollOpen(false)}>Cancel</Button>
            <Button type="submit" form="enroll-form" loading={enrolling}>Enroll</Button>
          </>
        }
      >
        <form id="enroll-form" onSubmit={handleEnroll} className="space-y-4">
          <div>
            <label className={labelCls}>Season *</label>
            {seasons.length === 0 ? (
              <p className="text-sm text-gray-500">No seasons found. Create a season first.</p>
            ) : (
              <select className={inputCls} value={enrollSeasonId} onChange={e => { setEnrollSeasonId(e.target.value); setEnrollDivisionId(''); }} required>
                <option value="" className="bg-navy">Select a season…</option>
                {seasons.map(s => (
                  <option key={s.id} value={s.id} className="bg-navy">{s.name}</option>
                ))}
              </select>
            )}
          </div>

          {enrollSelectedSeason && enrollSelectedSeason.seasonDivisions?.length > 1 && (
            <div>
              <label className={labelCls}>Division</label>
              <select className={inputCls} value={enrollDivisionId} onChange={e => setEnrollDivisionId(e.target.value)}>
                <option value="" className="bg-navy">— No division —</option>
                {enrollSelectedSeason.seasonDivisions.map(sd => (
                  <option key={sd.id} value={sd.id} className="bg-navy">{sd.division.name}</option>
                ))}
              </select>
            </div>
          )}

          <div
            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${enrollAutoApprove ? 'border-accent bg-accent/5' : 'border-white/10'}`}
            onClick={() => setEnrollAutoApprove(v => !v)}
          >
            <div>
              <div className="text-sm font-medium text-white">Auto-approve</div>
              <div className="text-xs text-gray-400 mt-0.5">Mark as approved immediately</div>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${enrollAutoApprove ? 'bg-accent' : 'bg-white/10'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${enrollAutoApprove ? 'left-5' : 'left-1'}`} />
            </div>
          </div>

          {enrollError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">{enrollError}</div>
          )}
        </form>
      </Modal>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { LeagueNav } from '@/components/league/LeagueNav';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

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

export default function TeamsPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<TeamReg[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [updating, setUpdating] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  async function loadData() {
    const leagueRes = await fetch(`/api/leagues/${slug}`);
    const leagueJson = await leagueRes.json();
    if (leagueJson.error) return;
    const id = leagueJson.data.id;
    setLeagueId(id);

    const regRes = await fetch(`/api/team-registrations?leagueId=${id}`);
    const regJson = await regRes.json();
    setRegistrations(regJson.data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadData(); }, [slug]);

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
        <div className="mb-6">
          <h1 className="text-2xl font-black text-white">Team Registrations</h1>
          <p className="text-gray-400 text-sm mt-0.5">{registrations.length} registration{registrations.length !== 1 ? 's' : ''} total</p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 bg-surface rounded-xl p-1 mb-6 overflow-x-auto w-full sm:w-fit">
          {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
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
              <p className="text-gray-400 text-sm">
                {filter === 'ALL' ? 'No registrations yet. Share your registration link to get teams signed up.' : `No ${filter.toLowerCase()} registrations.`}
              </p>
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
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

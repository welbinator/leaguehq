'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardHeader } from '@/components/ui/Card';
import { LeagueNav } from '@/components/league/LeagueNav';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { CreateSeasonModal } from '@/components/league/CreateSeasonModal';

const inputClass = 'w-full bg-navy border border-white/10 rounded-lg text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50';
const labelClass = 'block text-sm font-medium text-gray-300 mb-1.5';

export default function SettingsPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const searchParams = useSearchParams();
  const [league, setLeague] = useState<any>(null);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [leagueName, setLeagueName] = useState('');
  const [leagueSport, setLeagueSport] = useState('');
  const [leagueDesc, setLeagueDesc] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [stripeStatus, setStripeStatus] = useState<any>(null);
  const [connectLoading, setConnectLoading] = useState(false);

  const [seasonModalOpen, setSeasonModalOpen] = useState(false);

  // Delete modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000); }

  async function loadData() {
    const leagueRes = await fetch(`/api/leagues/${slug}`);
    const leagueJson = await leagueRes.json();
    if (leagueJson.data) {
      setLeague(leagueJson.data);
      setLeagueName(leagueJson.data.name);
      setLeagueSport(leagueJson.data.sport);
      setLeagueDesc(leagueJson.data.description ?? '');
      const seasonsRes = await fetch(`/api/seasons?leagueId=${leagueJson.data.id}`);
      const stripeRes = await fetch(`/api/stripe/connect/status?leagueId=${leagueJson.data.id}`);
      const stripeJson = await stripeRes.json();
      setStripeStatus(stripeJson);
      const seasonsJson = await seasonsRes.json();
      setSeasons(seasonsJson.data ?? []);
    }
  }

  useEffect(() => {
    loadData();
    if (searchParams.get('connect_success')) showToast('Stripe connected successfully!');
  }, [slug]);

  async function saveGeneral(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/leagues/${league.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: leagueName, sport: leagueSport, description: leagueDesc }),
    });
    setSaving(false);
    showToast('Saved!');
    loadData();
  }

  const SPORTS = ['Soccer','Basketball','Baseball','Football','Volleyball','Tennis','Hockey','Softball','Lacrosse','Rugby','Other'];

  return (
    <div className="min-h-screen bg-navy">
      <LeagueNav slug={slug} />

      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-accent text-navy font-semibold px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="mb-2">
          <h2 className="text-2xl font-black text-white">League Settings</h2>
          <p className="text-gray-400">Manage your league configuration and preferences.</p>
        </div>

        {/* General */}
        <Card>
          <CardHeader title="General" subtitle="Basic league information" />
          <form onSubmit={saveGeneral} className="space-y-4">
            <div>
              <label className={labelClass}>League Name</label>
              <input className={inputClass} value={leagueName} onChange={e => setLeagueName(e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>Sport</label>
              <select className={inputClass} value={leagueSport} onChange={e => setLeagueSport(e.target.value)}>
                {SPORTS.map(s => <option key={s} value={s} className="bg-navy">{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea className={inputClass} rows={3} value={leagueDesc} onChange={e => setLeagueDesc(e.target.value)} style={{resize:'none'}} />
            </div>
            <Button type="submit" loading={saving}>Save Changes</Button>
          </form>
        </Card>

        {/* Seasons */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardHeader title="Seasons" subtitle="Create and manage seasons" />
            <Button size="sm" onClick={() => setSeasonModalOpen(true)}>New Season</Button>
          </div>
          {seasons.length > 0 ? (
            <div className="space-y-3">
              {seasons.map(s => (
                <div key={s.id} className="flex items-start justify-between py-3 border-b border-white/[0.06] last:border-0 gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white">{s.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(s.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' → '}
                      {new Date(s.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                    {s.seasonDivisions?.length > 0 && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {s.seasonDivisions.map((sd: any) => sd.division.name).join(', ')}
                        {s.paymentRequired ? ` · ${s.seasonDivisions[0]?.pricingType === 'PER_PLAYER' ? 'per player' : 'per team'}` : ' · Free'}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.registrationOpen ? 'bg-accent/20 text-accent' : 'bg-white/5 text-gray-400'}`}>
                      {s.registrationOpen ? 'Open' : 'Closed'}
                    </span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/register/${slug}/${s.id}`); showToast('Link copied!'); }}
                      className="text-xs text-gray-400 hover:text-white border border-white/10 rounded px-2 py-0.5 transition-colors"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-2">No seasons yet. Create your first season to get started.</p>
          )}
        </Card>


                {/* Payments */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardHeader title="Payments" subtitle="Connect Stripe to collect registration fees from players" />
          </div>

          {stripeStatus?.complete ? (
            /* Fully onboarded */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-accent/5 border border-accent/20 rounded-xl">
                <div className="w-8 h-8 bg-accent/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white">Stripe Connected</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    {stripeStatus.chargesEnabled ? '✓ Charges enabled' : '⚠ Charges not yet enabled'}
                    {' · '}
                    {stripeStatus.payoutsEnabled ? '✓ Payouts enabled' : '⚠ Payouts pending'}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500">Registration payments will go directly to your Stripe account. LeagueHQ charges a small platform fee per transaction.</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (!confirm('Disconnect Stripe? Players will not be able to pay at registration until you reconnect.')) return;
                  await fetch('/api/stripe/disconnect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ leagueId: league.id }),
                  });
                  loadData();
                  showToast('Stripe disconnected');
                }}
              >
                Disconnect Stripe
              </Button>
            </div>
          ) : stripeStatus?.connected ? (
            /* Account created but onboarding incomplete */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
                <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <div className="text-sm font-medium text-white">Setup Incomplete</div>
                  <div className="text-xs text-gray-400 mt-0.5">Finish setting up your Stripe account to collect payments</div>
                </div>
              </div>
              <Button
                loading={connectLoading}
                onClick={async () => {
                  setConnectLoading(true);
                  const res = await fetch('/api/stripe/connect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ leagueId: league.id }),
                  });
                  const json = await res.json();
                  setConnectLoading(false);
                  if (json.url) window.location.href = json.url;
                }}
              >
                Continue Stripe Setup
              </Button>
            </div>
          ) : (
            /* Not connected */
            <div className="space-y-4">
              <p className="text-sm text-gray-400">Connect your Stripe account so players can pay registration fees directly to you when they sign up.</p>
              <Button
                loading={connectLoading}
                onClick={async () => {
                  setConnectLoading(true);
                  const res = await fetch('/api/stripe/connect', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ leagueId: league.id }),
                  });
                  const json = await res.json();
                  setConnectLoading(false);
                  if (json.url) window.location.href = json.url;
                  else showToast('Error starting Stripe setup');
                }}
              >
                Connect with Stripe
              </Button>
              <p className="text-xs text-gray-500">You'll be redirected to Stripe to set up your account. No Stripe account? You can create one during setup.</p>
            </div>
          )}
        </Card>

        {/* Danger Zone */}
        <Card>
          <CardHeader title="Danger Zone" subtitle="Irreversible actions" />
          <p className="text-sm text-gray-400 mb-4">Deleting your league will permanently remove all data including teams, players, schedules, and payment records.</p>
          <Button variant="danger" onClick={() => setDeleteModalOpen(true)}>Delete League</Button>
        </Card>
      </div>

      {/* Create Season Modal */}
      {league && (
        <CreateSeasonModal
          isOpen={seasonModalOpen}
          onClose={() => setSeasonModalOpen(false)}
          leagueId={league.id}
          slug={slug}
          onCreated={() => { loadData(); }}
        />
      )}

      {/* Delete Confirmation */}
      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete League"
        footer={<><Button variant="ghost" onClick={() => setDeleteModalOpen(false)}>Cancel</Button><Button variant="danger" disabled={deleteConfirm !== league?.name}>Delete Forever</Button></>}>
        <div className="space-y-4">
          <p className="text-sm text-gray-400">This will permanently delete <span className="text-white font-medium">{league?.name}</span> and all associated data. This cannot be undone.</p>
          <div>
            <label className={labelClass}>Type the league name to confirm: <span className="text-white">{league?.name}</span></label>
            <input className={inputClass} value={deleteConfirm} onChange={e => setDeleteConfirm(e.target.value)} placeholder={league?.name} />
          </div>
        </div>
      </Modal>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { LeagueNav } from '@/components/league/LeagueNav';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

const inputClass = 'w-full bg-navy border border-white/10 rounded-lg text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50';
const labelClass = 'block text-sm font-medium text-gray-300 mb-1.5';

interface SettingsPageProps { params: { slug: string }; }

export default function SettingsPage({ params }: SettingsPageProps) {
  const { slug } = params;
  const [league, setLeague] = useState<any>(null);
  const [divisions, setDivisions] = useState<any[]>([]);
  const [seasons, setSeasons] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [leagueName, setLeagueName] = useState('');
  const [leagueSport, setLeagueSport] = useState('');
  const [leagueDesc, setLeagueDesc] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Division modal
  const [divModalOpen, setDivModalOpen] = useState(false);
  const [newDivName, setNewDivName] = useState('');
  const [newDivDesc, setNewDivDesc] = useState('');
  const [savingDiv, setSavingDiv] = useState(false);

  // Season modal
  const [seasonModalOpen, setSeasonModalOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [seasonName, setSeasonName] = useState('');
  const [seasonStart, setSeasonStart] = useState('');
  const [seasonEnd, setSeasonEnd] = useState('');
  const [paymentRequired, setPaymentRequired] = useState(true);
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [divisionConfig, setDivisionConfig] = useState<Record<string, { enabled: boolean; price: string; pricingType: 'PER_PLAYER' | 'PER_TEAM' }>>({});
  const [savingSeason, setSavingSeason] = useState(false);
  const [createdSeason, setCreatedSeason] = useState<any>(null);

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
      const [divsRes, seasonsRes] = await Promise.all([
        fetch(`/api/divisions?leagueId=${leagueJson.data.id}`),
        fetch(`/api/seasons?leagueId=${leagueJson.data.id}`),
      ]);
      const divsJson = await divsRes.json();
      const seasonsJson = await seasonsRes.json();
      setDivisions(divsJson.data ?? []);
      setSeasons(seasonsJson.data ?? []);
    }
  }

  useEffect(() => { loadData(); }, [slug]);

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

  async function createDivision(e: React.FormEvent) {
    e.preventDefault();
    setSavingDiv(true);
    await fetch('/api/divisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ leagueId: league.id, name: newDivName, description: newDivDesc, order: divisions.length }),
    });
    setSavingDiv(false);
    setDivModalOpen(false);
    setNewDivName(''); setNewDivDesc('');
    loadData();
  }

  function openSeasonModal() {
    setStep(1);
    setSeasonName(''); setSeasonStart(''); setSeasonEnd('');
    setPaymentRequired(true); setPaymentDueDate('');
    setCreatedSeason(null);
    const cfg: typeof divisionConfig = {};
    divisions.forEach(d => { cfg[d.id] = { enabled: false, price: '', pricingType: 'PER_PLAYER' }; });
    setDivisionConfig(cfg);
    setSeasonModalOpen(true);
  }

  async function createSeason() {
    setSavingSeason(true);
    const enabledDivs = divisions.filter(d => divisionConfig[d.id]?.enabled);
    const res = await fetch('/api/seasons', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        leagueId: league.id,
        name: seasonName,
        startDate: seasonStart,
        endDate: seasonEnd,
        paymentRequired,
        paymentDueDate: !paymentRequired && paymentDueDate ? paymentDueDate : null,
        divisions: enabledDivs.map(d => ({
          divisionId: d.id,
          price: parseFloat(divisionConfig[d.id].price) || 0,
          pricingType: divisionConfig[d.id].pricingType,
        })),
      }),
    });
    const json = await res.json();
    setSavingSeason(false);
    if (json.data) {
      setCreatedSeason(json.data);
      setStep(5);
      loadData();
    }
  }

  const registrationLink = createdSeason
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/register/${slug}/${createdSeason.id}`
    : '';

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

        {/* Divisions */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardHeader title="Divisions" subtitle="Skill or age divisions for your league" />
            <Button size="sm" onClick={() => setDivModalOpen(true)}>Add Division</Button>
          </div>
          {divisions.length > 0 ? (
            <div className="space-y-2">
              {divisions.map(d => (
                <div key={d.id} className="flex items-center gap-3 py-2.5 border-b border-white/[0.06] last:border-0">
                  <div className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-white">{d.name}</div>
                    {d.description && <div className="text-xs text-gray-400">{d.description}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-2">No divisions yet. Divisions are optional — add them if your league has skill levels or age groups.</p>
          )}
        </Card>

        {/* Seasons */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <CardHeader title="Seasons" subtitle="Create and manage seasons" />
            <Button size="sm" onClick={openSeasonModal}>Create Season</Button>
          </div>
          {seasons.length > 0 ? (
            <div className="space-y-3">
              {seasons.map(s => (
                <div key={s.id} className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-0">
                  <div>
                    <div className="text-sm font-medium text-white">{s.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {new Date(s.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' → '}
                      {new Date(s.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {s.seasonDivisions?.length > 0 && ` · ${s.seasonDivisions.length} division${s.seasonDivisions.length !== 1 ? 's' : ''}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.registrationOpen ? 'bg-accent/20 text-accent' : 'bg-white/5 text-gray-400'}`}>
                      {s.registrationOpen ? 'Registration Open' : 'Closed'}
                    </span>
                    <button
                      onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/register/${slug}/${s.id}`); showToast('Registration link copied!'); }}
                      className="text-xs text-gray-400 hover:text-white border border-white/10 rounded px-2 py-0.5 transition-colors"
                    >
                      Copy Link
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-2">No seasons yet. Create your first season to start accepting registrations.</p>
          )}
        </Card>

        {/* Danger Zone */}
        <Card>
          <CardHeader title="Danger Zone" subtitle="Irreversible actions" />
          <p className="text-sm text-gray-400 mb-4">Deleting your league will permanently remove all data including teams, players, schedules, and payment records.</p>
          <Button variant="danger" onClick={() => setDeleteModalOpen(true)}>Delete League</Button>
        </Card>
      </div>

      {/* Add Division Modal */}
      <Modal isOpen={divModalOpen} onClose={() => setDivModalOpen(false)} title="Add Division"
        footer={<><Button variant="ghost" onClick={() => setDivModalOpen(false)}>Cancel</Button><Button type="submit" form="div-form" loading={savingDiv}>Add Division</Button></>}>
        <form id="div-form" onSubmit={createDivision} className="space-y-4">
          <Input label="Division Name" value={newDivName} onChange={e => setNewDivName(e.target.value)} placeholder="e.g. Division A (Competitive)" required />
          <Input label="Description (optional)" value={newDivDesc} onChange={e => setNewDivDesc(e.target.value)} placeholder="e.g. For experienced players" />
        </form>
      </Modal>

      {/* Create Season Modal */}
      <Modal isOpen={seasonModalOpen} onClose={() => setSeasonModalOpen(false)}
        title={step < 5 ? `Create Season — Step ${step} of 4` : 'Season Created!'}
        footer={step < 5 ? (
          <>
            {step > 1 && <Button variant="ghost" onClick={() => setStep(s => s - 1)}>Back</Button>}
            <Button variant="ghost" onClick={() => setSeasonModalOpen(false)}>Cancel</Button>
            {step < 4
              ? <Button onClick={() => setStep(s => s + 1)} disabled={step === 1 && (!seasonName || !seasonStart || !seasonEnd)}>Next</Button>
              : <Button onClick={createSeason} loading={savingSeason}>Create Season</Button>
            }
          </>
        ) : (
          <Button onClick={() => setSeasonModalOpen(false)}>Done</Button>
        )}
      >
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-4">
            <Input label="Season Name" value={seasonName} onChange={e => setSeasonName(e.target.value)} placeholder="e.g. Spring 2026" required />
            <div>
              <label className={labelClass}>Start Date</label>
              <input type="date" className={inputClass} value={seasonStart} onChange={e => setSeasonStart(e.target.value)} required />
            </div>
            <div>
              <label className={labelClass}>End Date</label>
              <input type="date" className={inputClass} value={seasonEnd} onChange={e => setSeasonEnd(e.target.value)} required />
            </div>
          </div>
        )}

        {/* Step 2: Payment Policy */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between p-4 bg-navy rounded-xl border border-white/10">
              <div>
                <div className="text-sm font-medium text-white">Require payment on registration</div>
                <div className="text-xs text-gray-400 mt-0.5">Players must pay immediately to complete registration</div>
              </div>
              <button
                onClick={() => setPaymentRequired(p => !p)}
                className={`relative w-11 h-6 rounded-full transition-colors ${paymentRequired ? 'bg-accent' : 'bg-white/10'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${paymentRequired ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            {!paymentRequired && (
              <div>
                <label className={labelClass}>Payment Due Date</label>
                <input type="date" className={inputClass} value={paymentDueDate} onChange={e => setPaymentDueDate(e.target.value)} />
                <p className="text-xs text-gray-400 mt-1.5">Players who pay after this date will need league director approval.</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Division Pricing */}
        {step === 3 && (
          <div className="space-y-4">
            {divisions.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-400 text-sm mb-1">No divisions configured for this league.</p>
                <p className="text-gray-500 text-xs">You can add divisions in the Divisions section. Season will be created without divisions.</p>
              </div>
            ) : (
              divisions.map(d => {
                const cfg = divisionConfig[d.id] ?? { enabled: false, price: '', pricingType: 'PER_PLAYER' };
                return (
                  <div key={d.id} className={`p-4 rounded-xl border transition-colors ${cfg.enabled ? 'border-accent/40 bg-accent/5' : 'border-white/10 bg-navy'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium text-white">{d.name}</div>
                        {d.description && <div className="text-xs text-gray-400">{d.description}</div>}
                      </div>
                      <button
                        onClick={() => setDivisionConfig(c => ({ ...c, [d.id]: { ...cfg, enabled: !cfg.enabled } }))}
                        className={`relative w-11 h-6 rounded-full transition-colors ${cfg.enabled ? 'bg-accent' : 'bg-white/10'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${cfg.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                      </button>
                    </div>
                    {cfg.enabled && (
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div>
                          <label className={labelClass}>Price ($)</label>
                          <input type="number" min="0" step="0.01" className={inputClass} placeholder="0.00"
                            value={cfg.price} onChange={e => setDivisionConfig(c => ({ ...c, [d.id]: { ...cfg, price: e.target.value } }))} />
                        </div>
                        <div>
                          <label className={labelClass}>Pricing Type</label>
                          <select className={inputClass} value={cfg.pricingType}
                            onChange={e => setDivisionConfig(c => ({ ...c, [d.id]: { ...cfg, pricingType: e.target.value as any } }))}>
                            <option value="PER_PLAYER" className="bg-navy">Per Player</option>
                            <option value="PER_TEAM" className="bg-navy">Per Team</option>
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-navy rounded-xl border border-white/10 divide-y divide-white/[0.06]">
              <div className="flex justify-between px-4 py-3"><span className="text-sm text-gray-400">Season Name</span><span className="text-sm font-medium text-white">{seasonName}</span></div>
              <div className="flex justify-between px-4 py-3"><span className="text-sm text-gray-400">Dates</span><span className="text-sm font-medium text-white">{seasonStart} → {seasonEnd}</span></div>
              <div className="flex justify-between px-4 py-3">
                <span className="text-sm text-gray-400">Payment</span>
                <span className="text-sm font-medium text-white">{paymentRequired ? 'Required on registration' : `Deferred${paymentDueDate ? ` (due ${paymentDueDate})` : ''}`}</span>
              </div>
              {divisions.filter(d => divisionConfig[d.id]?.enabled).map(d => {
                const cfg = divisionConfig[d.id];
                return (
                  <div key={d.id} className="flex justify-between px-4 py-3">
                    <span className="text-sm text-gray-400">{d.name}</span>
                    <span className="text-sm font-medium text-white">${cfg.price || '0'} / {cfg.pricingType === 'PER_PLAYER' ? 'player' : 'team'}</span>
                  </div>
                );
              })}
              {divisions.filter(d => divisionConfig[d.id]?.enabled).length === 0 && (
                <div className="px-4 py-3 text-sm text-gray-400">No divisions included</div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Success */}
        {step === 5 && createdSeason && (
          <div className="space-y-4 text-center">
            <div className="text-5xl">🎉</div>
            <h3 className="text-lg font-bold text-white">{createdSeason.name} created!</h3>
            <p className="text-sm text-gray-400">Share this registration link with your players:</p>
            <div className="flex items-center gap-2 bg-navy rounded-lg border border-white/10 p-3">
              <span className="text-xs text-accent flex-1 truncate text-left">{registrationLink}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(registrationLink); showToast('Copied!'); }}
                className="text-xs bg-accent text-navy font-semibold px-3 py-1.5 rounded-md hover:bg-accent/90 transition-colors flex-shrink-0"
              >
                Copy
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
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

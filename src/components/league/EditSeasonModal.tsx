'use client';

import { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const inputClass = 'w-full bg-navy border border-white/10 rounded-lg text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50';
const labelClass = 'block text-sm font-medium text-gray-300 mb-1.5';

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

interface EditSeasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  season: Season;
  onSaved: (season: Season) => void;
}

export function EditSeasonModal({ isOpen, onClose, season, onSaved }: EditSeasonModalProps) {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState<'UPCOMING' | 'ACTIVE' | 'COMPLETED'>('UPCOMING');
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [paymentRequired, setPaymentRequired] = useState(true);
  const [paymentDueDate, setPaymentDueDate] = useState('');
  const [divisions, setDivisions] = useState<{ divisionId: string; name: string; price: string; pricingType: 'PER_PLAYER' | 'PER_TEAM' }[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (season && isOpen) {
      setName(season.name);
      setStartDate(season.startDate ? season.startDate.split('T')[0] : '');
      setEndDate(season.endDate ? season.endDate.split('T')[0] : '');
      setStatus(season.status);
      setRegistrationOpen(season.registrationOpen);
      setPaymentRequired(season.paymentRequired);
      setPaymentDueDate(season.paymentDueDate ? season.paymentDueDate.split('T')[0] : '');
      setDivisions(
        season.seasonDivisions.map(sd => ({
          divisionId: sd.divisionId,
          name: sd.division.name,
          price: String(sd.price),
          pricingType: sd.pricingType,
        }))
      );
      setError(null);
    }
  }, [season, isOpen]);

  function updateDivision(idx: number, field: string, value: string) {
    setDivisions(d => d.map((div, i) => i === idx ? { ...div, [field]: value } : div));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/seasons/${season.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          startDate,
          endDate,
          status,
          registrationOpen,
          paymentRequired,
          paymentDueDate: paymentDueDate || null,
          divisions: divisions.map(d => ({
            divisionId: d.divisionId,
            price: parseFloat(d.price) || 0,
            pricingType: d.pricingType,
          })),
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      onSaved(json.data);
      onClose();
    } catch (e: any) {
      setError(e.message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>Cancel</Button>
      <Button onClick={handleSave} loading={saving}>Save Changes</Button>
    </>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Season" footer={footer}>
      <div className="space-y-5">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2.5 rounded-lg">
            {error}
          </div>
        )}

        <Input
          label="Season Name"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Spring 2026"
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Start Date</label>
            <input type="date" className={inputClass} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>End Date</label>
            <input type="date" className={inputClass} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Status</label>
          <div className="grid grid-cols-3 gap-2">
            {(['UPCOMING', 'ACTIVE', 'COMPLETED'] as const).map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`py-2 px-3 rounded-lg border text-xs font-semibold uppercase tracking-wide transition-all ${
                  status === s
                    ? 'border-accent bg-accent/10 text-accent'
                    : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                }`}
              >
                {s === 'UPCOMING' ? '🕐 Upcoming' : s === 'ACTIVE' ? '🟢 Active' : '✅ Completed'}
              </button>
            ))}
          </div>
        </div>

        <div
          className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${registrationOpen ? 'border-accent bg-accent/5' : 'border-white/10'}`}
          onClick={() => setRegistrationOpen(o => !o)}
        >
          <div>
            <div className="text-sm font-medium text-white">Registration Open</div>
            <div className="text-xs text-gray-400 mt-0.5">Allow players to register for this season</div>
          </div>
          <div className={`w-10 h-6 rounded-full transition-colors ${registrationOpen ? 'bg-accent' : 'bg-gray-600'} relative flex-shrink-0`}>
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${registrationOpen ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
        </div>

        <div>
          <label className={labelClass}>Payment Policy</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setPaymentRequired(true)}
              className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${paymentRequired ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'}`}
            >
              Required at signup
            </button>
            <button
              onClick={() => setPaymentRequired(false)}
              className={`py-2.5 px-3 rounded-lg border text-sm font-medium transition-all ${!paymentRequired ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'}`}
            >
              Pay later
            </button>
          </div>
          {!paymentRequired && (
            <div className="mt-3">
              <label className={labelClass}>Payment Due Date</label>
              <input type="date" className={inputClass} value={paymentDueDate} onChange={e => setPaymentDueDate(e.target.value)} />
            </div>
          )}
        </div>

        {divisions.length > 0 && (
          <div>
            <label className={labelClass}>Divisions &amp; Pricing</label>
            <div className="space-y-3">
              {divisions.map((div, idx) => (
                <div key={div.divisionId} className="p-3 bg-navy rounded-xl border border-white/10 space-y-3">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{div.name}</div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={labelClass}>Price ($)</label>
                      <input
                        type="number" min="0" step="0.01"
                        className={inputClass}
                        value={div.price}
                        onChange={e => updateDivision(idx, 'price', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelClass}>Per</label>
                      <select
                        className={inputClass}
                        value={div.pricingType}
                        onChange={e => updateDivision(idx, 'pricingType', e.target.value)}
                      >
                        <option value="PER_PLAYER">Player</option>
                        <option value="PER_TEAM">Team</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

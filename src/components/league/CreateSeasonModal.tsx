'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const inputClass = 'w-full bg-navy border border-white/10 rounded-lg text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50';
const labelClass = 'block text-sm font-medium text-gray-300 mb-1.5';

interface Division {
  name: string;
  price: string;
}

interface CreateSeasonModalProps {
  isOpen: boolean;
  onClose: () => void;
  leagueId: string;
  slug: string;
  onCreated: (season: any) => void;
}

export function CreateSeasonModal({ isOpen, onClose, leagueId, slug, onCreated }: CreateSeasonModalProps) {
  const [step, setStep] = useState(1);
  const totalSteps = 5; // 1:basics 2:free/paid 3:payment timing 4:divisions 5:success

  // Step 1
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [registrationOpen, setRegistrationOpen] = useState(false);

  // Step 2
  const [isPaid, setIsPaid] = useState<boolean | null>(null);
  const [pricingType, setPricingType] = useState<'PER_PLAYER' | 'PER_TEAM'>('PER_PLAYER');

  // Step 3
  const [paymentRequired, setPaymentRequired] = useState(true);
  const [paymentDueDate, setPaymentDueDate] = useState('');

  // Step 4
  const [divisionCount, setDivisionCount] = useState<'one' | 'multiple' | null>(null);
  const [singlePrice, setSinglePrice] = useState('');
  const [divisions, setDivisions] = useState<Division[]>([{ name: '', price: '' }]);

  const [saving, setSaving] = useState(false);
  const [createdSeason, setCreatedSeason] = useState<any>(null);

  // Effective step count depends on whether paid was chosen
  // If free: step 3 (payment timing) is skipped
  function getStepLabel() {
    if (step === 5) return 'Season Created!';
    // Show dynamic step numbers accounting for skip
    const displayed = isPaid === false && step >= 3 ? step - 1 : step;
    const total = isPaid === false ? 3 : 4;
    return `Create Season — Step ${displayed} of ${total}`;
  }

  function reset() {
    setStep(1);
    setName(''); setStartDate(''); setEndDate(''); setRegistrationOpen(false);
    setIsPaid(null); setPricingType('PER_PLAYER');
    setPaymentRequired(true); setPaymentDueDate('');
    setDivisionCount(null); setSinglePrice('');
    setDivisions([{ name: '', price: '' }]);
    setCreatedSeason(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function next() {
    if (step === 2 && isPaid === false) {
      // Skip payment timing step for free seasons
      setStep(4);
    } else {
      setStep(s => s + 1);
    }
  }

  function back() {
    if (step === 4 && isPaid === false) {
      setStep(2);
    } else {
      setStep(s => s - 1);
    }
  }

  function addDivision() {
    setDivisions(d => [...d, { name: '', price: '' }]);
  }

  function updateDivision(idx: number, field: keyof Division, value: string) {
    setDivisions(d => d.map((div, i) => i === idx ? { ...div, [field]: value } : div));
  }

  function removeDivision(idx: number) {
    setDivisions(d => d.filter((_, i) => i !== idx));
  }

  async function createSeason() {
    setSaving(true);
    try {
      let divisionsPayload: any[] = [];

      if (isPaid) {
        if (divisionCount === 'one') {
          // Single division — create unnamed default division
          divisionsPayload = [{
            name: 'General',
            price: parseFloat(singlePrice) || 0,
            pricingType,
            isDefault: true,
          }];
        } else {
          divisionsPayload = divisions
            .filter(d => d.name.trim())
            .map(d => ({
              name: d.name.trim(),
              price: parseFloat(d.price) || 0,
              pricingType,
            }));
        }
      }

      // For paid seasons with divisions, we need to create divisions first then link them
      // For now, send division data embedded and let the API handle it
      const res = await fetch('/api/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leagueId,
          name,
          startDate,
          endDate,
          registrationOpen,
          paymentRequired: isPaid ? paymentRequired : false,
          paymentDueDate: isPaid && !paymentRequired && paymentDueDate ? paymentDueDate : null,
          // Pass division data for inline creation
          inlineDivisions: divisionsPayload,
        }),
      });
      const json = await res.json();
      if (json.data) {
        setCreatedSeason(json.data);
        setStep(5);
        onCreated(json.data);
      }
    } finally {
      setSaving(false);
    }
  }

  const registrationLink = createdSeason
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/register/${slug}/${createdSeason.id}`
    : '';

  function copyLink() {
    navigator.clipboard.writeText(registrationLink);
  }

  const step1Valid = name.trim() && startDate && endDate;
  const step2Valid = isPaid !== null && (isPaid === false || pricingType);
  const step4Valid = divisionCount === 'one'
    ? singlePrice !== ''
    : divisions.length > 0 && divisions.every(d => d.name.trim() && (!isPaid || d.price !== ''));

  function renderFooter() {
    if (step === 5) {
      return <Button onClick={handleClose}>Done</Button>;
    }

    const isLastStep = isPaid === false ? step === 4 : step === 4;
    return (
      <>
        {step > 1 && <Button variant="ghost" onClick={back}>Back</Button>}
        <Button variant="ghost" onClick={handleClose}>Cancel</Button>
        {isLastStep ? (
          <Button onClick={createSeason} loading={saving}>Create Season</Button>
        ) : (
          <Button
            onClick={next}
            disabled={
              (step === 1 && !step1Valid) ||
              (step === 2 && !step2Valid)
            }
          >
            Next
          </Button>
        )}
      </>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={getStepLabel()} footer={renderFooter()}>

      {/* Step 1: Basics */}
      {step === 1 && (
        <div className="space-y-4">
          <Input
            label="Season Name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Spring 2026"
          />
          <div>
            <label className={labelClass}>Start Date</label>
            <input type="date" className={inputClass} value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>End Date</label>
            <input type="date" className={inputClass} value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div
            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${registrationOpen ? 'border-accent bg-accent/5' : 'border-white/10'}`}
            onClick={() => setRegistrationOpen(r => !r)}
          >
            <div>
              <div className="text-sm font-medium text-white">Open registration now</div>
              <div className="text-xs text-gray-400 mt-0.5">Players can register as soon as you create this season</div>
            </div>
            <div className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${registrationOpen ? 'bg-accent' : 'bg-white/10'}`}>
              <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${registrationOpen ? 'left-5' : 'left-1'}`} />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Free or Paid */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400">Is there a registration fee for this season?</p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setIsPaid(false)}
              className={`p-4 rounded-xl border text-sm font-medium transition-all ${isPaid === false ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'}`}
            >
              <div className="text-2xl mb-2">🆓</div>
              Free
            </button>
            <button
              onClick={() => setIsPaid(true)}
              className={`p-4 rounded-xl border text-sm font-medium transition-all ${isPaid === true ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'}`}
            >
              <div className="text-2xl mb-2">💰</div>
              Paid
            </button>
          </div>

          {isPaid === true && (
            <div className="mt-2">
              <label className={labelClass}>How is the fee charged?</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPricingType('PER_PLAYER')}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${pricingType === 'PER_PLAYER' ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'}`}
                >
                  Per Player
                </button>
                <button
                  onClick={() => setPricingType('PER_TEAM')}
                  className={`p-3 rounded-xl border text-sm font-medium transition-all ${pricingType === 'PER_TEAM' ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'}`}
                >
                  Per Team
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">You'll set the specific price in the next step.</p>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Payment timing (paid only) */}
      {step === 3 && isPaid && (
        <div className="space-y-5">
          <p className="text-sm text-gray-400">When does payment need to happen?</p>
          <div
            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${paymentRequired ? 'border-accent bg-accent/5' : 'border-white/10'}`}
            onClick={() => setPaymentRequired(true)}
          >
            <div>
              <div className="text-sm font-medium text-white">Required at registration</div>
              <div className="text-xs text-gray-400 mt-0.5">Players must pay to complete registration</div>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${paymentRequired ? 'border-accent bg-accent' : 'border-gray-500'}`} />
          </div>
          <div
            className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${!paymentRequired ? 'border-accent bg-accent/5' : 'border-white/10'}`}
            onClick={() => setPaymentRequired(false)}
          >
            <div>
              <div className="text-sm font-medium text-white">Pay later</div>
              <div className="text-xs text-gray-400 mt-0.5">Players can register and pay by a due date</div>
            </div>
            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${!paymentRequired ? 'border-accent bg-accent' : 'border-gray-500'}`} />
          </div>
          {!paymentRequired && (
            <div>
              <label className={labelClass}>Payment Due Date</label>
              <input type="date" className={inputClass} value={paymentDueDate} onChange={e => setPaymentDueDate(e.target.value)} />
              <p className="text-xs text-gray-500 mt-1.5">Players who miss this date will need your approval.</p>
            </div>
          )}
        </div>
      )}

      {/* Step 4: Divisions */}
      {step === 4 && (
        <div className="space-y-4">
          {isPaid ? (
            <>
              <p className="text-sm text-gray-400">How many divisions does this season have?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDivisionCount('one')}
                  className={`p-4 rounded-xl border text-sm font-medium transition-all ${divisionCount === 'one' ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'}`}
                >
                  <div className="text-2xl mb-2">1️⃣</div>
                  One division
                </button>
                <button
                  onClick={() => { setDivisionCount('multiple'); if (divisions.length < 2) setDivisions([{ name: '', price: '' }, { name: '', price: '' }]); }}
                  className={`p-4 rounded-xl border text-sm font-medium transition-all ${divisionCount === 'multiple' ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'}`}
                >
                  <div className="text-2xl mb-2">🏆</div>
                  Multiple
                </button>
              </div>

              {divisionCount === 'one' && (
                <div>
                  <label className={labelClass}>
                    Price {pricingType === 'PER_PLAYER' ? 'per player' : 'per team'} ($)
                  </label>
                  <input
                    type="number" min="0" step="0.01"
                    className={inputClass}
                    placeholder="0.00"
                    value={singlePrice}
                    onChange={e => setSinglePrice(e.target.value)}
                  />
                </div>
              )}

              {divisionCount === 'multiple' && (
                <div className="space-y-3">
                  {divisions.map((div, idx) => (
                    <div key={idx} className="p-3 bg-navy rounded-xl border border-white/10 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Division {idx + 1}</span>
                        {divisions.length > 2 && (
                          <button onClick={() => removeDivision(idx)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                        )}
                      </div>
                      <input
                        className={inputClass}
                        placeholder="Division name (e.g. Competitive)"
                        value={div.name}
                        onChange={e => updateDivision(idx, 'name', e.target.value)}
                      />
                      <div>
                        <label className={labelClass}>Price {pricingType === 'PER_PLAYER' ? 'per player' : 'per team'} ($)</label>
                        <input
                          type="number" min="0" step="0.01"
                          className={inputClass}
                          placeholder="0.00"
                          value={div.price}
                          onChange={e => updateDivision(idx, 'price', e.target.value)}
                        />
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={addDivision}
                    className="w-full py-2.5 rounded-xl border border-dashed border-white/20 text-sm text-gray-400 hover:text-white hover:border-white/40 transition-all"
                  >
                    + Add Another Division
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Free season — still ask about divisions but no pricing */
            <>
              <p className="text-sm text-gray-400">Does this season have multiple divisions?</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setDivisionCount('one')}
                  className={`p-4 rounded-xl border text-sm font-medium transition-all ${divisionCount === 'one' ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'}`}
                >
                  <div className="text-2xl mb-2">1️⃣</div>
                  No divisions
                </button>
                <button
                  onClick={() => { setDivisionCount('multiple'); if (divisions.length < 2) setDivisions([{ name: '', price: '' }, { name: '', price: '' }]); }}
                  className={`p-4 rounded-xl border text-sm font-medium transition-all ${divisionCount === 'multiple' ? 'border-accent bg-accent/10 text-accent' : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'}`}
                >
                  <div className="text-2xl mb-2">🏆</div>
                  Yes, multiple
                </button>
              </div>

              {divisionCount === 'multiple' && (
                <div className="space-y-3">
                  {divisions.map((div, idx) => (
                    <div key={idx} className="p-3 bg-navy rounded-xl border border-white/10 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Division {idx + 1}</span>
                        {divisions.length > 2 && (
                          <button onClick={() => removeDivision(idx)} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                        )}
                      </div>
                      <input
                        className={inputClass}
                        placeholder="Division name (e.g. Competitive)"
                        value={div.name}
                        onChange={e => updateDivision(idx, 'name', e.target.value)}
                      />
                    </div>
                  ))}
                  <button
                    onClick={addDivision}
                    className="w-full py-2.5 rounded-xl border border-dashed border-white/20 text-sm text-gray-400 hover:text-white hover:border-white/40 transition-all"
                  >
                    + Add Another Division
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Step 5: Success */}
      {step === 5 && createdSeason && (
        <div className="space-y-4 text-center py-2">
          <div className="text-5xl">🎉</div>
          <h3 className="text-lg font-bold text-white">{createdSeason.name} is ready!</h3>
          <p className="text-sm text-gray-400">Share this registration link with your players:</p>
          <div className="flex items-center gap-2 bg-navy rounded-lg border border-white/10 p-3 text-left">
            <span className="text-xs text-accent flex-1 truncate">{registrationLink}</span>
            <button
              onClick={copyLink}
              className="text-xs bg-accent text-navy font-semibold px-3 py-1.5 rounded-md hover:bg-accent/90 transition-colors flex-shrink-0"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

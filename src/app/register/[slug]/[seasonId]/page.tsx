'use client';

import { useEffect, useState } from 'react';

const inputClass = 'w-full bg-white/5 border border-white/10 rounded-lg text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder-gray-500';
const labelClass = 'block text-sm font-medium text-gray-300 mb-1.5';

const SPORT_EMOJI: Record<string, string> = {
  Soccer: '⚽', Basketball: '🏀', Baseball: '⚾', Football: '🏈',
  Volleyball: '🏐', Tennis: '🎾', Hockey: '🏒', Softball: '🥎',
  Lacrosse: '🥍', Rugby: '🏉', Other: '🏆',
};

export default function RegisterPage({ params }: { params: { slug: string; seasonId: string } }) {
  const { slug, seasonId } = params;
  const [season, setSeason] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [teamName, setTeamName] = useState('');
  const [captainName, setCaptainName] = useState('');
  const [captainEmail, setCaptainEmail] = useState('');
  const [captainPhone, setCaptainPhone] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetch(`/api/public/register/${seasonId}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) throw new Error(json.error);
        setSeason(json.data);
        // Auto-select if only one division
        if (json.data.seasonDivisions?.length === 1) {
          setSelectedDivision(json.data.seasonDivisions[0].id);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [seasonId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          seasonDivisionId: selectedDivision || null,
          teamName,
          captainName,
          captainEmail,
          captainPhone,
          notes,
        }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setSubmitted(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !season) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4">
        <div className="text-center">
          <div className="text-4xl mb-4">🚫</div>
          <h1 className="text-xl font-bold text-white mb-2">Registration Unavailable</h1>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-black text-white mb-2">You're registered!</h1>
          <p className="text-gray-400 mb-1">
            <span className="text-white font-medium">{teamName}</span> has been submitted for{' '}
            <span className="text-white font-medium">{season.name}</span>.
          </p>
          <p className="text-gray-500 text-sm mt-4">
            The league director will be in touch with next steps.
            {season.paymentRequired && ' Payment will be collected during registration confirmation.'}
          </p>
        </div>
      </div>
    );
  }

  const league = season.league;
  const emoji = SPORT_EMOJI[league?.sport] ?? '🏆';
  const hasDivisions = season.seasonDivisions?.length > 1;
  const isFree = !season.paymentRequired;

  return (
    <div className="min-h-screen bg-[#0a0f1e]">
      {/* Header */}
      <div className="bg-[#1e293b] border-b border-white/[0.06]">
        <div className="max-w-xl mx-auto px-4 py-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{emoji}</span>
            <div>
              <div className="text-xs text-gray-400 font-medium uppercase tracking-wide">{league?.sport} League</div>
              <h1 className="text-lg font-black text-white">{league?.name}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 py-8">
        {/* Season info card */}
        <div className="bg-[#1e293b] rounded-2xl border border-white/[0.06] p-5 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-bold text-white">{season.name}</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                {new Date(season.startDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                {' – '}
                {new Date(season.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>
            <div className="text-right">
              {isFree ? (
                <span className="text-[#22c55e] font-bold text-sm">Free</span>
              ) : (
                <div>
                  {season.seasonDivisions?.[0] && (
                    <span className="text-[#22c55e] font-bold text-sm">
                      ${parseFloat(season.seasonDivisions[0].price) || 0}
                      <span className="text-gray-400 font-normal">
                        /{season.seasonDivisions[0].pricingType === 'PER_PLAYER' ? 'player' : 'team'}
                      </span>
                    </span>
                  )}
                  {!season.paymentRequired && season.paymentDueDate && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Due {new Date(season.paymentDueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Registration form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <h3 className="text-base font-bold text-white mb-4">Team Information</h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Team Name <span className="text-red-400">*</span></label>
                <input className={inputClass} value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. The Mighty Ducks" required />
              </div>

              {hasDivisions && (
                <div>
                  <label className={labelClass}>Division <span className="text-red-400">*</span></label>
                  <select
                    className={inputClass}
                    value={selectedDivision}
                    onChange={e => setSelectedDivision(e.target.value)}
                    required
                  >
                    <option value="" className="bg-[#0a0f1e]">Select a division...</option>
                    {season.seasonDivisions.map((sd: any) => (
                      <option key={sd.id} value={sd.id} className="bg-[#0a0f1e]">
                        {sd.division.name}
                        {sd.price > 0 ? ` — $${parseFloat(sd.price)}/${sd.pricingType === 'PER_PLAYER' ? 'player' : 'team'}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-white mb-4">Team Captain / Contact</h3>
            <div className="space-y-4">
              <div>
                <label className={labelClass}>Full Name <span className="text-red-400">*</span></label>
                <input className={inputClass} value={captainName} onChange={e => setCaptainName(e.target.value)} placeholder="Your full name" required />
              </div>
              <div>
                <label className={labelClass}>Email Address <span className="text-red-400">*</span></label>
                <input type="email" className={inputClass} value={captainEmail} onChange={e => setCaptainEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div>
                <label className={labelClass}>Phone Number</label>
                <input type="tel" className={inputClass} value={captainPhone} onChange={e => setCaptainPhone(e.target.value)} placeholder="(optional)" />
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass}>Additional Notes</label>
            <textarea
              className={inputClass}
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Anything the league director should know..."
              style={{ resize: 'none' }}
            />
          </div>

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#22c55e] text-[#0a0f1e] font-bold py-3.5 rounded-xl text-sm hover:bg-[#22c55e]/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting…' : 'Submit Registration'}
          </button>

          <p className="text-center text-xs text-gray-500">
            By submitting you agree to be contacted by the league organizer.
          </p>
        </form>
      </div>
    </div>
  );
}

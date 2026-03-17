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
  const [existingTeams, setExistingTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Role
  const [isCaptain, setIsCaptain] = useState<boolean | null>(null);

  // Team
  const [teamMode, setTeamMode] = useState<'new' | 'existing'>('new');
  const [teamName, setTeamName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');

  // Player info
  const [playerName, setPlayerName] = useState('');
  const [playerEmail, setPlayerEmail] = useState('');
  const [playerPhone, setPlayerPhone] = useState('');

  // Division
  const [selectedDivision, setSelectedDivision] = useState('');

  // Notes
  const [notes, setNotes] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/public/register/${seasonId}`).then(r => r.json()),
      fetch(`/api/public/teams?seasonId=${seasonId}`).then(r => r.json()),
    ])
      .then(([seasonJson, teamsJson]) => {
        if (seasonJson.error) throw new Error(seasonJson.error);
        setSeason(seasonJson.data);
        setExistingTeams(teamsJson.data ?? []);
        if (seasonJson.data.seasonDivisions?.length === 1) {
          setSelectedDivision(seasonJson.data.seasonDivisions[0].id);
        }
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [seasonId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          seasonDivisionId: selectedDivision || null,
          isCaptain,
          teamName: isCaptain && teamMode === 'new' ? teamName : null,
          existingTeamId: (!isCaptain || teamMode === 'existing') ? selectedTeamId : null,
          playerName,
          playerEmail,
          playerPhone,
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

  const resolvedTeamName = isCaptain
    ? (teamMode === 'new' ? teamName : existingTeams.find(t => t.id === selectedTeamId)?.name ?? '')
    : existingTeams.find(t => t.id === selectedTeamId)?.name ?? '';

  if (submitted) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-black text-white mb-2">You're registered!</h1>
          <p className="text-gray-400 mb-1">
            <span className="text-white font-medium">{playerName}</span> has been added to{' '}
            <span className="text-white font-medium">{resolvedTeamName || season?.name}</span>.
          </p>
          <p className="text-gray-500 text-sm mt-4">
            The league director will be in touch with next steps.
          </p>
        </div>
      </div>
    );
  }

  const league = season.league;
  const emoji = SPORT_EMOJI[league?.sport] ?? '🏆';
  const hasDivisions = season.seasonDivisions?.length > 1;
  const isFree = !season.paymentRequired;

  const formReady = isCaptain !== null;
  const teamReady = isCaptain
    ? (teamMode === 'new' ? teamName.trim() : selectedTeamId)
    : selectedTeamId;

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

      <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
        {/* Season info card */}
        <div className="bg-[#1e293b] rounded-2xl border border-white/[0.06] p-5">
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
              ) : season.seasonDivisions?.[0] ? (
                <span className="text-[#22c55e] font-bold text-sm">
                  ${parseFloat(season.seasonDivisions[0].price) || 0}
                  <span className="text-gray-400 font-normal">
                    /{season.seasonDivisions[0].pricingType === 'PER_PLAYER' ? 'player' : 'team'}
                  </span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Step 1: Are you a captain? */}
          <div className="bg-[#1e293b] rounded-2xl border border-white/[0.06] p-5 space-y-4">
            <h3 className="text-base font-bold text-white">Your Role</h3>
            <p className="text-sm text-gray-400">Are you registering as a team captain?</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => { setIsCaptain(true); setTeamMode('new'); }}
                className={`p-4 rounded-xl border text-sm font-medium transition-all ${isCaptain === true ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]' : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'}`}
              >
                <div className="text-2xl mb-2">👑</div>
                Yes, I'm a captain
              </button>
              <button
                type="button"
                onClick={() => { setIsCaptain(false); setTeamMode('existing'); }}
                className={`p-4 rounded-xl border text-sm font-medium transition-all ${isCaptain === false ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]' : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'}`}
              >
                <div className="text-2xl mb-2">🙋</div>
                No, joining a team
              </button>
            </div>
          </div>

          {/* Step 2: Team selection (shown after role chosen) */}
          {isCaptain !== null && (
            <div className="bg-[#1e293b] rounded-2xl border border-white/[0.06] p-5 space-y-4">
              <h3 className="text-base font-bold text-white">Team</h3>

              {isCaptain ? (
                <>
                  {/* Captain: new team or existing */}
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setTeamMode('new')}
                      className={`p-3 rounded-xl border text-sm font-medium transition-all ${teamMode === 'new' ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]' : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'}`}
                    >
                      Create new team
                    </button>
                    <button
                      type="button"
                      onClick={() => setTeamMode('existing')}
                      disabled={existingTeams.length === 0}
                      className={`p-3 rounded-xl border text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${teamMode === 'existing' ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]' : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'}`}
                    >
                      Existing team
                    </button>
                  </div>

                  {teamMode === 'new' ? (
                    <div>
                      <label className={labelClass}>Team Name <span className="text-red-400">*</span></label>
                      <input className={inputClass} value={teamName} onChange={e => setTeamName(e.target.value)} placeholder="e.g. The Mighty Ducks" required />
                    </div>
                  ) : (
                    <div>
                      <label className={labelClass}>Select Your Team <span className="text-red-400">*</span></label>
                      <select className={inputClass} value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)} required>
                        <option value="" className="bg-[#0a0f1e]">Choose a team...</option>
                        {existingTeams.map(t => (
                          <option key={t.id} value={t.id} className="bg-[#0a0f1e]">{t.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              ) : (
                /* Non-captain: must select existing team */
                existingTeams.length > 0 ? (
                  <div>
                    <label className={labelClass}>Select Your Team <span className="text-red-400">*</span></label>
                    <select className={inputClass} value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)} required>
                      <option value="" className="bg-[#0a0f1e]">Choose a team...</option>
                      {existingTeams.map(t => (
                        <option key={t.id} value={t.id} className="bg-[#0a0f1e]">{t.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 bg-white/5 rounded-xl p-4">
                    No teams have registered yet. If you're joining a team, check back once your captain has registered — or contact the league director.
                  </p>
                )
              )}

              {/* Division selector */}
              {hasDivisions && (
                <div>
                  <label className={labelClass}>Division <span className="text-red-400">*</span></label>
                  <select className={inputClass} value={selectedDivision} onChange={e => setSelectedDivision(e.target.value)} required>
                    <option value="" className="bg-[#0a0f1e]">Select a division...</option>
                    {season.seasonDivisions.map((sd: any) => (
                      <option key={sd.id} value={sd.id} className="bg-[#0a0f1e]">
                        {sd.division.name}{sd.price > 0 ? ` — $${parseFloat(sd.price)}/${sd.pricingType === 'PER_PLAYER' ? 'player' : 'team'}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Personal info (shown after team chosen) */}
          {formReady && teamReady && (
            <div className="bg-[#1e293b] rounded-2xl border border-white/[0.06] p-5 space-y-4">
              <h3 className="text-base font-bold text-white">Your Info</h3>
              <div>
                <label className={labelClass}>Full Name <span className="text-red-400">*</span></label>
                <input className={inputClass} value={playerName} onChange={e => setPlayerName(e.target.value)} placeholder="Your full name" required />
              </div>
              <div>
                <label className={labelClass}>Email Address <span className="text-red-400">*</span></label>
                <input type="email" className={inputClass} value={playerEmail} onChange={e => setPlayerEmail(e.target.value)} placeholder="you@example.com" required />
              </div>
              <div>
                <label className={labelClass}>Phone Number</label>
                <input type="tel" className={inputClass} value={playerPhone} onChange={e => setPlayerPhone(e.target.value)} placeholder="(optional)" />
              </div>
              <div>
                <label className={labelClass}>Notes</label>
                <textarea className={inputClass} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything the league director should know..." style={{ resize: 'none' }} />
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>
          )}

          {formReady && teamReady && playerName && playerEmail && (
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#22c55e] text-[#0a0f1e] font-bold py-3.5 rounded-xl text-sm hover:bg-[#22c55e]/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting…' : 'Submit Registration'}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';

interface Season {
  id: string;
  name: string;
  paymentRequired: boolean;
  registrationOpen: boolean;
  league: { id: string; name: string; sport: string; slug: string };
  seasonDivisions: { id: string; price: any; pricingType: string; division: { id: string; name: string } }[];
}

type Step = 'account' | 'team' | 'processing' | 'done';

export default function RegisterPage({ params }: { params: { slug: string; seasonId: string } }) {
  const { slug, seasonId } = params;
  const [season, setSeason] = useState<Season | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('account');

  // Account step fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [isExistingAccount, setIsExistingAccount] = useState(false);
  const [accountError, setAccountError] = useState('');
  const [accountLoading, setAccountLoading] = useState(false);

  // Team step fields
  const [isCaptain, setIsCaptain] = useState<boolean | null>(null);
  const [teamMode, setTeamMode] = useState<'new' | 'existing'>('new');
  const [teamName, setTeamName] = useState('');
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [selectedDivisionId, setSelectedDivisionId] = useState('');
  const [notes, setNotes] = useState('');
  const [existingTeams, setExistingTeams] = useState<{ id: string; teamName: string; enrollmentId?: string }[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamError, setTeamError] = useState('');

  // Handle ?payment=success return from Stripe
  const paymentSuccess = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('payment') === 'success';
  const paymentCancelled = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('payment') === 'cancelled';

  useEffect(() => {
    fetch(`/api/public/register/${seasonId}`)
      .then(r => r.json())
      .then(json => {
        if (json.error) { setError(json.error); return; }
        setSeason(json.data);
        if (json.data.seasonDivisions?.length === 1) setSelectedDivisionId(json.data.seasonDivisions[0].id);
      })
      .catch(() => setError('Failed to load registration info'));
  }, [seasonId]);

  // Load existing teams for "join a team" option
  useEffect(() => {
    if (isCaptain === false || (isCaptain === true && teamMode === 'existing')) {
      fetch(`/api/public/teams?seasonId=${seasonId}`)
        .then(r => r.json())
        .then(json => setExistingTeams(json.data ?? []));
    }
  }, [isCaptain, teamMode, seasonId]);

  async function handleAccountSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAccountError('');
    if (password !== confirmPassword) { setAccountError('Passwords do not match'); return; }
    if (password.length < 8) { setAccountError('Password must be at least 8 characters'); return; }
    setAccountLoading(true);
    try {
      const res = await fetch('/api/auth/register-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, phone, address, city, state, zip, password }),
      });
      const json = await res.json();
      if (json.error) { setAccountError(json.error); return; }
      setUserId(json.data.id);
      setIsExistingAccount(json.data.isExisting);
      setStep('team');
    } catch {
      setAccountError('Something went wrong. Please try again.');
    } finally {
      setAccountLoading(false);
    }
  }

  async function handleTeamSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTeamError('');
    setTeamLoading(true);
    try {
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          seasonId,
          seasonDivisionId: selectedDivisionId || null,
          isCaptain,
          teamName: isCaptain && teamMode === 'new' ? teamName : null,
          existingTeamId: (!isCaptain || teamMode === 'existing') ? selectedTeamId : null,
          playerName: `${firstName} ${lastName}`,
          playerEmail: email,
          playerPhone: phone || null,
          notes: notes || null,
          userId,
        }),
      });
      const json = await res.json();
      if (json.error) { setTeamError(json.error); return; }

      const registrationId = json.data.id;

      if (season?.paymentRequired) {
        setStep('processing');
        const checkoutRes = await fetch('/api/stripe/checkout/registration', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ registrationId, registrationType: isCaptain ? 'team' : 'player' }),
        });
        const checkoutJson = await checkoutRes.json();
        if (checkoutJson.url) {
          window.location.href = checkoutJson.url;
          return;
        }
        // Checkout failed — show an error instead of silently going to "done"
        const errMsg = checkoutJson.error ?? 'Could not create payment session. Please contact the league director.';
        setStep('team');
        setTeamError(errMsg);
        return;
      }

      setStep('done');
    } catch {
      setTeamError('Something went wrong. Please try again.');
    } finally {
      setTeamLoading(false);
    }
  }

  // Loading state
  if (!season && !error) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Error / closed
  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-white mb-2">Registration Unavailable</h1>
          <p className="text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  // Payment success return
  if (paymentSuccess) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-black text-white mb-2">Payment confirmed!</h1>
          <p className="text-gray-400">Your payment was successful and your registration is confirmed.</p>
          <p className="text-gray-500 text-sm mt-3">The league director will be in touch with next steps.</p>
        </div>
      </div>
    );
  }

  // Done (no payment required)
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-black text-white mb-2">You&apos;re registered!</h1>
          <p className="text-gray-400 mb-1">
            {isExistingAccount ? 'Welcome back! Your registration is submitted.' : 'Your account has been created and your registration is submitted.'}
          </p>
          {!isExistingAccount && (
            <p className="text-gray-500 text-sm mt-2">You can now <a href="/login" className="text-[#22c55e] hover:underline">log in</a> with your email and password.</p>
          )}
          <p className="text-gray-500 text-sm mt-3">The league director will be in touch with next steps.</p>
        </div>
      </div>
    );
  }

  // Processing (redirecting to Stripe)
  if (step === 'processing') {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-10 h-10 border-2 border-[#22c55e] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-semibold">Redirecting to payment…</p>
        </div>
      </div>
    );
  }

  const inputCls = "w-full bg-[#0a0f1e] border border-white/10 rounded-lg text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#22c55e]/50 placeholder-gray-500 appearance-none";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1.5";

  return (
    <div className="min-h-screen bg-[#0a0f1e] py-10 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏆</div>
          <h1 className="text-2xl font-black text-white">{season!.league.name}</h1>
          <p className="text-gray-400 text-sm mt-1">{season!.name} Registration</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {['account', 'team'].map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                step === s ? 'bg-[#22c55e] text-black' :
                (step === 'team' && s === 'account') ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-white/10 text-gray-500'
              }`}>{i + 1}</div>
              <span className={`text-xs font-medium ${step === s ? 'text-white' : 'text-gray-500'}`}>
                {s === 'account' ? 'Your Account' : 'Team / Role'}
              </span>
              {i < 1 && <div className="flex-1 h-px bg-white/10 mx-2" />}
            </div>
          ))}
        </div>

        {/* Step 1: Account */}
        {step === 'account' && (
          <form onSubmit={handleAccountSubmit} className="space-y-4">
            <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6">
              <h2 className="text-base font-bold text-white mb-4">Create your account</h2>
              <p className="text-xs text-gray-500 mb-5">Already have an account? Enter your email and password to continue.</p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className={labelCls}>First Name *</label>
                  <input className={inputCls} value={firstName} onChange={e => setFirstName(e.target.value)} required placeholder="James" />
                </div>
                <div>
                  <label className={labelCls}>Last Name *</label>
                  <input className={inputCls} value={lastName} onChange={e => setLastName(e.target.value)} required placeholder="Smith" />
                </div>
              </div>

              <div className="mb-4">
                <label className={labelCls}>Email *</label>
                <input className={inputCls} type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" />
              </div>

              <div className="mb-4">
                <label className={labelCls}>Phone</label>
                <input className={inputCls} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(555) 000-0000" />
              </div>

              <div className="mb-4">
                <label className={labelCls}>Street Address</label>
                <input className={inputCls} value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St" />
              </div>

              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="col-span-1">
                  <label className={labelCls}>City</label>
                  <input className={inputCls} value={city} onChange={e => setCity(e.target.value)} placeholder="Cedar Rapids" />
                </div>
                <div>
                  <label className={labelCls}>State</label>
                  <input className={inputCls} value={state} onChange={e => setState(e.target.value)} placeholder="IA" maxLength={2} />
                </div>
                <div>
                  <label className={labelCls}>ZIP</label>
                  <input className={inputCls} value={zip} onChange={e => setZip(e.target.value)} placeholder="52401" />
                </div>
              </div>

              <div className="border-t border-white/8 pt-5">
                <h3 className="text-sm font-semibold text-white mb-3">Password</h3>
                <div className="mb-3">
                  <label className={labelCls}>Password *</label>
                  <input className={inputCls} type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min. 8 characters" />
                </div>
                <div>
                  <label className={labelCls}>Confirm Password *</label>
                  <input className={inputCls} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="Repeat password" />
                </div>
              </div>

              {accountError && (
                <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">{accountError}</div>
              )}
            </div>

            <button
              type="submit"
              disabled={accountLoading}
              className="w-full bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {accountLoading ? 'Saving…' : 'Continue →'}
            </button>
          </form>
        )}

        {/* Step 2: Team / Role */}
        {step === 'team' && (
          <form onSubmit={handleTeamSubmit} className="space-y-4">
            <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-6">
              <h2 className="text-base font-bold text-white mb-1">Join the league</h2>
              <p className="text-xs text-gray-500 mb-5">Hi {firstName}! Choose your role for {season!.name}.</p>

              {/* Role selection */}
              <div className="mb-5">
                <label className={labelCls}>I am a…</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => { setIsCaptain(true); setTeamMode('new'); }}
                    className={`p-4 rounded-xl border text-sm font-medium transition-all ${isCaptain === true ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]' : 'border-white/10 text-gray-400 hover:border-white/20'}`}>
                    🏅 Team Captain
                  </button>
                  <button type="button" onClick={() => setIsCaptain(false)}
                    className={`p-4 rounded-xl border text-sm font-medium transition-all ${isCaptain === false ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]' : 'border-white/10 text-gray-400 hover:border-white/20'}`}>
                    👤 Player
                  </button>
                </div>
              </div>

              {/* Captain options */}
              {isCaptain === true && (
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>Team</label>
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <button type="button" onClick={() => setTeamMode('new')}
                        className={`p-3 rounded-xl border text-sm font-medium transition-all ${teamMode === 'new' ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]' : 'border-white/10 text-gray-400 hover:border-white/20'}`}>
                        + New Team
                      </button>
                      <button type="button" onClick={() => setTeamMode('existing')} disabled={existingTeams.length === 0}
                        className={`p-3 rounded-xl border text-sm font-medium transition-all disabled:opacity-40 ${teamMode === 'existing' ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]' : 'border-white/10 text-gray-400 hover:border-white/20'}`}>
                        Existing Team
                      </button>
                    </div>
                    {teamMode === 'new' ? (
                      <input className={inputCls} value={teamName} onChange={e => setTeamName(e.target.value)} required placeholder="Team name" />
                    ) : (
                      <select className={inputCls} value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)} required>
                        <option value="" className="bg-[#0a0f1e]">Select a team…</option>
                        {existingTeams.map(t => <option key={t.id} value={t.id} className="bg-[#0a0f1e]">{t.teamName}</option>)}
                      </select>
                    )}
                  </div>
                </div>
              )}

              {/* Player joining a team */}
              {isCaptain === false && (
                <div>
                  <label className={labelCls}>Select your team</label>
                  {existingTeams.length === 0 ? (
                    <p className="text-sm text-gray-500 bg-white/5 rounded-lg px-4 py-3">No teams have registered yet. Check back once your captain has registered.</p>
                  ) : (
                    <select className={inputCls} value={selectedTeamId} onChange={e => setSelectedTeamId(e.target.value)} required>
                      <option value="" className="bg-[#0a0f1e]">Select a team…</option>
                      {existingTeams.map(t => <option key={t.id} value={t.id} className="bg-[#0a0f1e]">{t.teamName}</option>)}
                    </select>
                  )}
                </div>
              )}

              {/* Division selector */}
              {isCaptain !== null && season!.seasonDivisions.length > 1 && (
                <div className="mt-4">
                  <label className={labelCls}>Division</label>
                  <select className={inputCls} value={selectedDivisionId} onChange={e => setSelectedDivisionId(e.target.value)} required>
                    <option value="" className="bg-[#0a0f1e]">Select a division…</option>
                    {season!.seasonDivisions.map(sd => (
                      <option key={sd.id} value={sd.id} className="bg-[#0a0f1e]">{sd.division.name} — ${parseFloat(sd.price) || 0}/{sd.pricingType === 'PER_PLAYER' ? 'player' : 'team'}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notes */}
              {isCaptain !== null && (
                <div className="mt-4">
                  <label className={labelCls}>Notes (optional)</label>
                  <textarea className={inputCls + ' resize-none'} rows={2} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything the director should know?" />
                </div>
              )}

              {/* Payment info */}
              {isCaptain !== null && season!.paymentRequired && (
                <div className="mt-4 bg-[#22c55e]/10 border border-[#22c55e]/20 rounded-lg px-4 py-3">
                  <p className="text-[#22c55e] text-sm font-medium">
                    💳 Payment required — {season!.seasonDivisions.length > 0
                      ? `$${parseFloat(season!.seasonDivisions.find(sd => sd.id === selectedDivisionId)?.price ?? season!.seasonDivisions[0]?.price ?? '0') || 0}`
                      : 'amount set by league'
                    }
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5">You&apos;ll be redirected to Stripe to complete payment.</p>
                </div>
              )}

              {teamError && (
                <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">{teamError}</div>
              )}
            </div>

            <div className="flex gap-3">
              <button type="button" onClick={() => setStep('account')}
                className="flex-1 border border-white/10 text-gray-400 hover:text-white font-medium py-3 rounded-xl transition-colors text-sm">
                ← Back
              </button>
              <button type="submit" disabled={teamLoading || isCaptain === null}
                className="flex-2 flex-1 bg-[#22c55e] hover:bg-[#16a34a] text-black font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {teamLoading ? 'Submitting…' : season!.paymentRequired ? 'Continue to Payment →' : 'Complete Registration →'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

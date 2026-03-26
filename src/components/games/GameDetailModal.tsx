'use client';

import { useState } from 'react';

interface Game {
  id: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  scheduledAt: string;
  location?: string | null;
  status?: string;
  scoreStatus?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  homeScoreHome?: number | null;
  awayScoreHome?: number | null;
  homeScoreAway?: number | null;
  awayScoreAway?: number | null;
  season?: { name: string } | null;
  division?: { name: string } | null;
}

interface Props {
  game: Game;
  isCaptain: boolean;         // true = show score entry section
  onClose: () => void;
  onSaved?: (updated: Game) => void;
}

function formatGameDateTime(iso: string) {
  const d = new Date(iso);
  const date = d.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC',
  });
  const time = d.toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', timeZone: 'UTC',
  });
  return { date, time };
}

export function GameDetailModal({ game, isCaptain, onClose, onSaved }: Props) {
  const { date, time } = formatGameDateTime(game.scheduledAt);

  const isConfirmed = game.scoreStatus === 'CONFIRMED';
  const isDisputed  = game.scoreStatus === 'DISPUTED';
  const isPending   = game.scoreStatus === 'PENDING_HOME' || game.scoreStatus === 'PENDING_AWAY';

  // Pre-fill with confirmed score if editing, otherwise blank
  const [homeScore, setHomeScore] = useState<string>(
    game.homeScore != null ? String(game.homeScore) : ''
  );
  const [awayScore, setAwayScore] = useState<string>(
    game.awayScore != null ? String(game.awayScore) : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    const h = parseInt(homeScore);
    const a = parseInt(awayScore);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) {
      setError('Please enter valid scores (0 or greater).');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/${game.id}/score`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeScore: h, awayScore: a }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to save score');
      setSubmitted(true);
      onSaved?.(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#1e293b] border border-white/[0.08] rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle (mobile) */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* ── Game header ── */}
        <div className="px-6 pt-4 pb-5 border-b border-white/[0.06]">
          {/* Teams */}
          <div className="flex items-center justify-between gap-4 mb-4">
            {/* Home team */}
            <div className="flex-1 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-xl">🏠</span>
              </div>
              <p className="text-white font-bold text-sm leading-tight">{game.homeTeam.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">Home</p>
            </div>

            {/* Score / VS */}
            <div className="text-center flex-shrink-0">
              {isConfirmed && game.homeScore != null ? (
                <div className="text-3xl font-black text-white tracking-tight">
                  {game.homeScore}<span className="text-gray-600 mx-1">–</span>{game.awayScore}
                </div>
              ) : (
                <div className="text-2xl font-black text-gray-600">VS</div>
              )}
              {isConfirmed && (
                <span className="text-xs text-[#22c55e] font-medium">Final</span>
              )}
              {isDisputed && (
                <span className="text-xs text-yellow-400 font-medium">⚠️ Disputed</span>
              )}
              {isPending && (
                <span className="text-xs text-gray-500 font-medium">⏳ Pending</span>
              )}
            </div>

            {/* Away team */}
            <div className="flex-1 text-center">
              <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-2">
                <span className="text-xl">✈️</span>
              </div>
              <p className="text-white font-bold text-sm leading-tight">{game.awayTeam.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">Away</p>
            </div>
          </div>

          {/* Game details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 text-sm">
              <span className="text-gray-500">📅</span>
              <span className="text-gray-300">{date}</span>
            </div>
            <div className="flex items-center gap-2.5 text-sm">
              <span className="text-gray-500">🕐</span>
              <span className="text-gray-300">{time}</span>
            </div>
            {game.location && (
              <div className="flex items-center gap-2.5 text-sm">
                <span className="text-gray-500">📍</span>
                <span className="text-gray-300">{game.location}</span>
              </div>
            )}
            {(game.season || game.division) && (
              <div className="flex items-center gap-2.5 text-sm">
                <span className="text-gray-500">🏆</span>
                <span className="text-gray-300">
                  {[game.season?.name, game.division?.name].filter(Boolean).join(' · ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Captain score section ── */}
        {isCaptain && !submitted && (
          <div className="px-6 py-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
              {isConfirmed ? 'Update Score' : 'Submit Score'}
            </p>

            {isDisputed && (
              <div className="mb-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-xs text-yellow-300">
                ⚠️ Scores don't match — update yours to agree with the other captain and it'll auto-confirm.
                <div className="mt-1.5 text-gray-400">
                  {game.homeTeam.name} submitted: {game.homeScoreHome}–{game.awayScoreHome}<br />
                  {game.awayTeam.name} submitted: {game.homeScoreAway}–{game.awayScoreAway}
                </div>
              </div>
            )}

            {error && (
              <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2 text-red-400 text-sm">{error}</div>
            )}

            <div className="flex items-end gap-3 mb-5">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1.5 truncate">{game.homeTeam.name}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={homeScore}
                  onChange={e => setHomeScore(e.target.value)}
                  className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-3 text-white text-3xl font-black text-center focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20"
                  placeholder="0"
                />
              </div>
              <div className="text-gray-600 font-black text-xl pb-3.5">–</div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1.5 truncate">{game.awayTeam.name}</label>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={awayScore}
                  onChange={e => setAwayScore(e.target.value)}
                  className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-3 text-white text-3xl font-black text-center focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20"
                  placeholder="0"
                />
              </div>
            </div>

            <button
              onClick={handleSubmit}
              disabled={saving || homeScore === '' || awayScore === ''}
              className="w-full py-3 rounded-xl bg-[#22c55e] text-white font-bold text-sm hover:bg-[#16a34a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Submitting…' : 'Submit Score'}
            </button>
          </div>
        )}

        {/* Submitted confirmation */}
        {isCaptain && submitted && (
          <div className="px-6 py-5 text-center">
            <div className="text-3xl mb-2">✅</div>
            <p className="text-white font-bold text-sm">Score submitted!</p>
            <p className="text-gray-400 text-xs mt-1">Waiting for the other captain to confirm.</p>
          </div>
        )}

        {/* Close button */}
        <div className="px-6 pb-6 pt-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm font-medium hover:text-white hover:border-white/20 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

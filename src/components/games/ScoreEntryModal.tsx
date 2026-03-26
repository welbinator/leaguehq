'use client';

import { useState } from 'react';

interface Game {
  id: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  homeScore?: number | null;
  awayScore?: number | null;
  homeScoreHome?: number | null;
  awayScoreHome?: number | null;
  homeScoreAway?: number | null;
  awayScoreAway?: number | null;
  scoreStatus?: string;
}

interface Props {
  game: Game;
  onClose: () => void;
  onSaved: (updated: Game) => void;
}

export function ScoreEntryModal({ game, onClose, onSaved }: Props) {
  const [homeScore, setHomeScore] = useState<string>(
    game.homeScore != null ? String(game.homeScore) : ''
  );
  const [awayScore, setAwayScore] = useState<string>(
    game.awayScore != null ? String(game.awayScore) : ''
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      onSaved(json.data);
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1e293b] border border-white/[0.08] rounded-2xl p-6 w-full max-w-sm shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-lg font-bold text-white mb-1">Enter Score</h2>
        <p className="text-sm text-gray-400 mb-6">
          {game.homeTeam.name} <span className="text-gray-600">vs</span> {game.awayTeam.name}
        </p>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-red-400 text-sm">{error}</div>
        )}

        <div className="flex items-center gap-3 mb-6">
          {/* Home score */}
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1.5 font-medium truncate">{game.homeTeam.name}</label>
            <input
              type="number"
              min="0"
              value={homeScore}
              onChange={e => setHomeScore(e.target.value)}
              className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-3 text-white text-2xl font-black text-center focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20"
              placeholder="0"
              autoFocus
            />
          </div>

          <div className="text-gray-600 font-bold text-lg mt-5">–</div>

          {/* Away score */}
          <div className="flex-1">
            <label className="block text-xs text-gray-400 mb-1.5 font-medium truncate">{game.awayTeam.name}</label>
            <input
              type="number"
              min="0"
              value={awayScore}
              onChange={e => setAwayScore(e.target.value)}
              className="w-full bg-[#0f172a] border border-white/10 rounded-xl px-3 py-3 text-white text-2xl font-black text-center focus:outline-none focus:border-[#22c55e]/50 focus:ring-1 focus:ring-[#22c55e]/20"
              placeholder="0"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm font-medium hover:text-white hover:border-white/20 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || homeScore === '' || awayScore === ''}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#22c55e] text-white text-sm font-bold hover:bg-[#16a34a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Submit Score'}
          </button>
        </div>
      </div>
    </div>
  );
}

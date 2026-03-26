'use client';

import { useEffect, useState } from 'react';
import { GameDetailModal } from '@/components/games/GameDetailModal';

const SPORT_EMOJI: Record<string, string> = {
  Soccer: '⚽', Basketball: '🏀', Baseball: '⚾', Football: '🏈',
  Volleyball: '🏐', Tennis: '🎾', Hockey: '🏒', Softball: '🥎',
  Lacrosse: '🥍', Rugby: '🏉', Other: '🏆',
};

interface Props {
  teamId: string;
  currentUserId?: string;       // to determine if viewer is captain
  onClose: () => void;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' }),
    month: d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }),
    day: d.getUTCDate(),
  };
}

export function TeamProfileModal({ teamId, currentUserId, onClose }: Props) {
  const [team, setTeam] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'roster' | 'schedule'>('roster');
  const [selectedGame, setSelectedGame] = useState<any | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/teams/${teamId}`)
      .then(r => r.json())
      .then(j => {
        if (j.error) throw new Error(j.error);
        setTeam(j.data);
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [teamId]);

  const isCaptain = team?.captainId === currentUserId;
  const sport = team?.league?.sport ?? 'Other';
  const emoji = SPORT_EMOJI[sport] ?? '🏆';

  const now = new Date();
  const upcoming = team?.games?.filter((g: any) => new Date(g.scheduledAt) >= now) ?? [];
  const past     = team?.games?.filter((g: any) => new Date(g.scheduledAt) <  now).reverse() ?? [];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/70 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={onClose}
      >
        <div
          className="bg-[#1e293b] border border-white/[0.08] rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl flex flex-col max-h-[90vh]"
          onClick={e => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-3 pb-1 sm:hidden flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-white/20" />
          </div>

          {/* ── Header ── */}
          <div className="px-6 pt-4 pb-5 border-b border-white/[0.06] flex-shrink-0">
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-white/5 animate-pulse" />
                <div className="space-y-2">
                  <div className="w-32 h-4 rounded bg-white/10 animate-pulse" />
                  <div className="w-20 h-3 rounded bg-white/5 animate-pulse" />
                </div>
              </div>
            ) : error ? (
              <p className="text-red-400 text-sm">{error}</p>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl flex-shrink-0">
                    {emoji}
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-white leading-tight">{team.name}</h2>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {team.league?.name}
                      {team.division && ` · ${team.division.name}`}
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {!loading && !error && team && (
            <>
              {/* ── Captain pill ── */}
              {team.captain && (
                <div className="px-6 py-3 border-b border-white/[0.06] flex items-center gap-2 flex-shrink-0">
                  <span className="text-sm">⭐</span>
                  <span className="text-xs text-gray-400">Captain:</span>
                  <span className="text-sm font-semibold text-white">
                    {team.captain.firstName && team.captain.lastName
                      ? `${team.captain.firstName} ${team.captain.lastName}`
                      : team.captain.name}
                  </span>
                </div>
              )}

              {/* ── Tabs ── */}
              <div className="flex px-6 pt-3 gap-1 flex-shrink-0">
                {(['roster', 'schedule'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all capitalize ${
                      activeTab === tab
                        ? 'bg-white/10 text-white'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    {tab === 'roster' ? `Roster (${team.members?.length ?? 0})` : `Schedule (${team.games?.length ?? 0})`}
                  </button>
                ))}
              </div>

              {/* ── Tab content ── */}
              <div className="flex-1 overflow-y-auto px-6 py-4">

                {/* ROSTER */}
                {activeTab === 'roster' && (
                  <div className="space-y-2">
                    {team.members?.length === 0 && (
                      <p className="text-center text-gray-500 text-sm py-8">No players on roster yet.</p>
                    )}
                    {team.members?.map((m: any) => {
                      const isCap = m.user.id === team.captainId;
                      const name = m.user.firstName && m.user.lastName
                        ? `${m.user.firstName} ${m.user.lastName}`
                        : m.user.name;
                      return (
                        <div key={m.id} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#0f172a] border border-white/[0.05]">
                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/10 flex items-center justify-center flex-shrink-0 text-sm font-bold text-white">
                            {m.user.avatarUrl
                              ? <img src={m.user.avatarUrl} className="w-8 h-8 rounded-full object-cover" alt="" />
                              : (m.user.firstName?.[0] ?? m.user.name?.[0] ?? '?').toUpperCase()
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{name}</p>
                          </div>
                          {isCap && (
                            <span className="text-xs bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                              Captain
                            </span>
                          )}
                          {!isCap && m.role === 'COACH' && (
                            <span className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                              Coach
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* SCHEDULE */}
                {activeTab === 'schedule' && (
                  <div className="space-y-5">
                    {team.games?.length === 0 && (
                      <p className="text-center text-gray-500 text-sm py-8">No games scheduled yet.</p>
                    )}

                    {upcoming.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Upcoming</p>
                        <div className="space-y-2">
                          {upcoming.map((game: any) => {
                            const { month, day, time, date } = formatDateTime(game.scheduledAt);
                            const isHome = game.homeTeam.id === teamId;
                            const opponent = isHome ? game.awayTeam.name : game.homeTeam.name;
                            const confirmed = game.scoreStatus === 'CONFIRMED' && game.homeScore != null;
                            return (
                              <button
                                key={game.id}
                                onClick={() => setSelectedGame(game)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#0f172a] border border-white/[0.05] hover:border-white/20 transition-all text-left"
                              >
                                <div className="text-center w-12 flex-shrink-0">
                                  <p className="text-xs text-[#22c55e] font-bold uppercase">{month}</p>
                                  <p className="text-lg font-black text-white leading-none">{day}</p>
                                </div>
                                <div className="w-px h-8 bg-white/10 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-white truncate">
                                    {isHome ? '🏠' : '✈️'} vs {opponent}
                                  </p>
                                  <p className="text-xs text-gray-500 truncate">
                                    {time}{game.location ? ` · 📍 ${game.location}` : ''}
                                  </p>
                                </div>
                                {confirmed && (
                                  <span className="text-[#22c55e] font-black text-sm flex-shrink-0">
                                    {game.homeScore}–{game.awayScore}
                                  </span>
                                )}
                                <span className="text-gray-600 flex-shrink-0">›</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {past.length > 0 && (
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recent Results</p>
                        <div className="space-y-2 opacity-75">
                          {past.map((game: any) => {
                            const { month, day, time } = formatDateTime(game.scheduledAt);
                            const isHome = game.homeTeam.id === teamId;
                            const opponent = isHome ? game.awayTeam.name : game.homeTeam.name;
                            const confirmed = game.scoreStatus === 'CONFIRMED' && game.homeScore != null;
                            return (
                              <button
                                key={game.id}
                                onClick={() => setSelectedGame(game)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#0f172a] border border-white/[0.05] hover:border-white/20 transition-all text-left"
                              >
                                <div className="text-center w-12 flex-shrink-0">
                                  <p className="text-xs text-gray-500 font-bold uppercase">{month}</p>
                                  <p className="text-lg font-black text-gray-400 leading-none">{day}</p>
                                </div>
                                <div className="w-px h-8 bg-white/10 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-gray-300 truncate">
                                    {isHome ? '🏠' : '✈️'} vs {opponent}
                                  </p>
                                  <p className="text-xs text-gray-600 truncate">
                                    {time}{game.location ? ` · 📍 ${game.location}` : ''}
                                  </p>
                                </div>
                                {confirmed && (
                                  <span className="text-gray-400 font-black text-sm flex-shrink-0">
                                    {game.homeScore}–{game.awayScore}
                                  </span>
                                )}
                                <span className="text-gray-700 flex-shrink-0">›</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Close button */}
          <div className="px-6 pb-6 pt-2 flex-shrink-0 border-t border-white/[0.06]">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl border border-white/10 text-gray-400 text-sm font-medium hover:text-white hover:border-white/20 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Game detail sub-modal */}
      {selectedGame && (
        <GameDetailModal
          game={selectedGame}
          isCaptain={isCaptain}
          onClose={() => setSelectedGame(null)}
          onSaved={(updated) => {
            setTeam((prev: any) => prev
              ? { ...prev, games: prev.games.map((g: any) => g.id === updated.id ? { ...g, ...updated } : g) }
              : prev
            );
            setSelectedGame((prev: any) => prev ? { ...prev, ...updated } : prev);
          }}
        />
      )}
    </>
  );
}

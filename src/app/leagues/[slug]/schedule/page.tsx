'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import type { GameStatus } from '@/types';

const statusVariant: Record<GameStatus, 'default' | 'success' | 'warning' | 'danger'> = {
  SCHEDULED: 'default',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  POSTPONED: 'warning',
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Convert HH:MM (24h) to "6:00 PM" display format */
function formatTime24(t: string): string {
  const match = t.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return t;
  let h = parseInt(match[1]);
  const m = match[2];
  const suffix = h >= 12 ? 'PM' : 'AM';
  if (h > 12) h -= 12;
  if (h === 0) h = 12;
  return `${h}:${m} ${suffix}`;
}

interface SchedulePageProps {
  params: { slug: string };
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Season { id: string; name: string; }
interface Division { id: string; name: string; }
interface Team { id: string; name: string; }
interface GamePreview {
  homeTeamId: string; awayTeamId: string;
  homeTeamName: string; awayTeamName: string;
  scheduledAt: string; location: string;
  round?: number; label?: string;
}
interface GameRecord {
  id: string;
  homeTeam: { id: string; name: string };
  awayTeam: { id: string; name: string };
  season?: { id: string; name: string };
  division?: { id: string; name: string };
  scheduledAt: string;
  location?: string;
  status: GameStatus;
  scheduleGroupId?: string;
  notes?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupGamesByScheduleGroup(games: GameRecord[]) {
  const groups: Record<string, GameRecord[]> = {};
  for (const g of games) {
    const key = g.scheduleGroupId ?? '__ungrouped__';
    if (!groups[key]) groups[key] = [];
    groups[key].push(g);
  }
  return groups;
}

function formatDateTime(iso: string) {
  const d = new Date(iso);
  return {
    date: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    time: d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
    month: d.toLocaleDateString('en-US', { month: 'short' }),
    day: d.getDate(),
  };
}

// ─── Schedule Builder ─────────────────────────────────────────────────────────

function ScheduleBuilder({ leagueId, subscriptionTier, onSaved }: {
  leagueId: string;
  subscriptionTier: string;
  onSaved: () => void;
}) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);

  const [selectedSeason, setSelectedSeason] = useState('');
  const [selectedDivision, setSelectedDivision] = useState('');
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
  const [scheduleType, setScheduleType] = useState<'ROUND_ROBIN' | 'SINGLE_ELIM' | 'DOUBLE_ELIM'>('ROUND_ROBIN');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [gameDays, setGameDays] = useState<number[]>([6]); // Sat default
  const [timeSlots, setTimeSlots] = useState<string[]>(['18:00']);
  const [newTimeSlot, setNewTimeSlot] = useState('');
  const [location, setLocation] = useState('');

  const [preview, setPreview] = useState<GamePreview[] | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/seasons?leagueId=${leagueId}`)
      .then(r => r.json())
      .then(j => setSeasons(j.data ?? []));
  }, [leagueId, subscriptionTier]);

  useEffect(() => {
    if (!selectedSeason) { setDivisions([]); setSelectedDivision(''); return; }
    fetch(`/api/seasons/${selectedSeason}`)
      .then(r => r.json())
      .then(j => {
        const divs = (j.data?.seasonDivisions ?? []).map((sd: any) => sd.division);
        setDivisions(divs);
        setSelectedDivision('');
        // Default start/end dates to the season's dates
        if (j.data?.startDate) setStartDate(j.data.startDate.split('T')[0]);
        if (j.data?.endDate) setEndDate(j.data.endDate.split('T')[0]);
      });
  }, [selectedSeason]);

  useEffect(() => {
    if (!selectedDivision || !selectedSeason) { setTeams([]); setSelectedTeams([]); return; }
    fetch(`/api/teams?leagueId=${leagueId}&divisionId=${selectedDivision}&seasonId=${selectedSeason}`)
      .then(r => r.json())
      .then(j => {
        const t = j.data ?? [];
        setTeams(t);
        setSelectedTeams(t.map((x: Team) => x.id));
      });
  }, [selectedDivision, selectedSeason, leagueId]);

  const toggleTeam = (id: string) => {
    setSelectedTeams(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleDay = (day: number) => {
    setGameDays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]);
  };

  const addTimeSlot = () => {
    const t = newTimeSlot.trim();
    if (t && !timeSlots.includes(t)) setTimeSlots(prev => [...prev, t]);
    setNewTimeSlot('');
  };

  const removeTimeSlot = (t: string) => setTimeSlots(prev => prev.filter(x => x !== t));

  const buildPayload = () => ({
    leagueId,
    seasonId: selectedSeason,
    divisionId: selectedDivision,
    type: scheduleType,
    teamIds: selectedTeams,
    startDate,
    endDate,
    gameDays,
    timeSlots,
    location,
  });

  const handlePreview = async () => {
    setError(null);
    setPreview(null);
    setPreviewLoading(true);
    try {
      const res = await fetch('/api/schedules/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to generate preview');
      setPreview(json.data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirm = async () => {
    setError(null);
    setSaving(true);
    try {
      const res = await fetch('/api/schedules/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Failed to save schedule');
      setSuccess(`✅ Schedule saved — ${json.count} games created`);
      setPreview(null);
      onSaved();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // Paywall gate — disabled for now, all tiers get access.
  // To re-enable: check subscriptionTier === 'FREE' or a league.schedulerEnabled flag.
  // if (subscriptionTier === 'FREE') { return <UpgradePrompt />; }

  return (
    <div className="space-y-6">
      <Card>
        <h3 className="text-lg font-bold text-white mb-6">Build a Schedule</h3>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">{error}</div>
        )}
        {success && (
          <div className="mb-4 bg-accent/10 border border-accent/20 rounded-xl p-4 text-accent text-sm">{success}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Season */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Season</label>
            <select
              value={selectedSeason}
              onChange={e => setSelectedSeason(e.target.value)}
              className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent/50"
            >
              <option value="">Select a season…</option>
              {seasons.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          {/* Division */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Division</label>
            <select
              value={selectedDivision}
              onChange={e => setSelectedDivision(e.target.value)}
              disabled={!divisions.length}
              className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent/50 disabled:opacity-40"
            >
              <option value="">Select a division…</option>
              {divisions.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
        </div>

        {/* Teams */}
        {teams.length > 0 && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Teams <span className="text-gray-500 font-normal">({selectedTeams.length} selected)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {teams.map(t => (
                <button
                  key={t.id}
                  onClick={() => toggleTeam(t.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    selectedTeams.includes(t.id)
                      ? 'bg-accent text-white'
                      : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Schedule Type */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Schedule Type</label>
          <div className="flex flex-wrap gap-3">
            {([
              { value: 'ROUND_ROBIN', label: '🔄 Round Robin', desc: 'Every team plays each other' },
              { value: 'SINGLE_ELIM', label: '🏆 Single Elimination', desc: 'One loss and you\'re out' },
              { value: 'DOUBLE_ELIM', label: '🥊 Double Elimination', desc: 'Two losses to be eliminated' },
            ] as const).map(opt => (
              <button
                key={opt.value}
                onClick={() => setScheduleType(opt.value)}
                className={`flex-1 min-w-[160px] p-3 rounded-xl border text-left transition-colors ${
                  scheduleType === opt.value
                    ? 'bg-accent/10 border-accent/50 text-white'
                    : 'bg-white/[0.03] border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                }`}
              >
                <div className="font-medium text-sm">{opt.label}</div>
                <div className="text-xs text-gray-500 mt-0.5">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent/50"
            />
          </div>
        </div>

        {/* Game Days */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Game Days</label>
          <div className="flex gap-2">
            {DAY_NAMES.map((name, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                  gameDays.includes(i)
                    ? 'bg-accent text-white'
                    : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Time Slots */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Time Slots</label>
          <div className="flex flex-wrap gap-2 mb-3">
            {timeSlots.map(t => (
              <span key={t} className="flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm text-white">
                {formatTime24(t)}
                <button
                  onClick={() => removeTimeSlot(t)}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                >×</button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="time"
              value={newTimeSlot}
              onChange={e => setNewTimeSlot(e.target.value)}
              className="bg-navy border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent/50"
            />
            <Button variant="secondary" size="sm" onClick={addTimeSlot}>+ Add</Button>
          </div>
        </div>

        {/* Location */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-300 mb-1">Default Location <span className="text-gray-500 font-normal">(optional)</span></label>
          <input
            type="text"
            value={location}
            onChange={e => setLocation(e.target.value)}
            placeholder="e.g. Main Field, Riverside Park"
            className="w-full bg-navy border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent/50"
          />
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            onClick={handlePreview}
            loading={previewLoading}
            disabled={!selectedSeason || !selectedDivision || !selectedTeams.length || !startDate || !endDate || !gameDays.length || !timeSlots.length}
          >
            Preview Schedule
          </Button>
        </div>
      </Card>

      {/* Preview */}
      {preview && preview.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white">Schedule Preview</h3>
              <p className="text-sm text-gray-400">{preview.filter(g => g.homeTeamId !== 'TBD').length} games will be created</p>
            </div>
            <Button onClick={handleConfirm} loading={saving}>
              Confirm &amp; Save Schedule
            </Button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="text-left py-2 pr-4 text-gray-500 font-medium">Date &amp; Time</th>
                  <th className="text-left py-2 pr-4 text-gray-500 font-medium">Matchup</th>
                  <th className="text-left py-2 pr-4 text-gray-500 font-medium">Location</th>
                  <th className="text-left py-2 text-gray-500 font-medium">Round</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((g, i) => {
                  const d = new Date(g.scheduledAt);
                  return (
                    <tr key={i} className={`${i < preview.length - 1 ? 'border-b border-white/[0.04]' : ''} ${g.homeTeamId === 'TBD' ? 'opacity-40' : ''}`}>
                      <td className="py-2.5 pr-4 text-gray-300 whitespace-nowrap">
                        {d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        <span className="text-gray-500 ml-2">
                          {d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4 text-white font-medium">
                        {g.homeTeamName} <span className="text-gray-500 font-normal">vs</span> {g.awayTeamName}
                      </td>
                      <td className="py-2.5 pr-4 text-gray-400">{g.location || '—'}</td>
                      <td className="py-2.5 text-gray-500 text-xs">{g.label}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {preview && preview.length === 0 && (
        <Card>
          <p className="text-center text-gray-400 py-8">No games could be generated with the current settings. Try expanding your date range or adding more game days.</p>
        </Card>
      )}
    </div>
  );
}

// ─── Existing Schedules ───────────────────────────────────────────────────────

function ExistingSchedules({ leagueId, refreshKey }: { leagueId: string; refreshKey: number }) {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/games?leagueId=${leagueId}`)
      .then(r => r.json())
      .then(j => setGames(j.data ?? []))
      .finally(() => setLoading(false));
  }, [leagueId]);

  useEffect(() => { load(); }, [load, refreshKey]);

  const deleteGroup = async (groupId: string) => {
    if (!confirm('Delete all games in this schedule group?')) return;
    setDeleting(groupId);
    await fetch(`/api/schedules/${groupId}`, { method: 'DELETE' });
    setDeleting(null);
    load();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const groups = groupGamesByScheduleGroup(games);
  const groupEntries = Object.entries(groups).filter(([k]) => k !== '__ungrouped__');
  const ungrouped = groups['__ungrouped__'] ?? [];

  if (!games.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">📅</div>
      <h3 className="text-lg font-bold text-white mb-1">No games scheduled yet</h3>
      <p className="text-gray-400 text-sm">Use the builder above to generate your first schedule.</p>
    </div>
  );

  const renderGameGroup = (groupGames: GameRecord[], groupId: string) => {
    const sample = groupGames[0];
    const isOpen = expanded === groupId;
    const label = sample.scheduleGroupId
      ? `${sample.season?.name ?? 'Unknown Season'} — ${sample.division?.name ?? 'Unknown Division'}`
      : 'Manually Added';

    return (
      <div key={groupId} className="border border-white/[0.08] rounded-xl overflow-hidden">
        <div
          className="flex items-center gap-3 px-4 py-3 bg-white/[0.02] cursor-pointer hover:bg-white/[0.04] transition-colors"
          onClick={() => setExpanded(isOpen ? null : groupId)}
        >
          <span className="text-lg">{isOpen ? '▾' : '▸'}</span>
          <span className="flex-1 font-medium text-white text-sm">{label}</span>
          <span className="text-xs text-gray-500">{groupGames.length} game{groupGames.length !== 1 ? 's' : ''}</span>
          {sample.scheduleGroupId && (
            <button
              onClick={e => { e.stopPropagation(); deleteGroup(groupId); }}
              disabled={deleting === groupId}
              className="ml-2 text-gray-600 hover:text-red-400 transition-colors disabled:opacity-50 text-lg leading-none"
              title="Delete this schedule group"
            >
              {deleting === groupId ? '…' : '🗑'}
            </button>
          )}
        </div>
        {isOpen && (
          <div className="divide-y divide-white/[0.04]">
            {groupGames.map(game => {
              const { date, time } = formatDateTime(game.scheduledAt);
              return (
                <div key={game.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="min-w-[130px] text-xs text-gray-500">
                    {date} <span className="text-gray-600">·</span> {time}
                  </div>
                  <div className="flex-1 text-sm font-medium text-white">
                    {game.homeTeam.name} <span className="text-gray-500 font-normal">vs</span> {game.awayTeam.name}
                  </div>
                  {game.location && <div className="text-xs text-gray-500 hidden sm:block">{game.location}</div>}
                  <Badge variant={statusVariant[game.status]}>{game.status.charAt(0) + game.status.slice(1).toLowerCase()}</Badge>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {groupEntries.map(([gid, gs]) => renderGameGroup(gs, gid))}
      {ungrouped.length > 0 && renderGameGroup(ungrouped, '__ungrouped__')}
    </div>
  );
}

// ─── Player View ──────────────────────────────────────────────────────────────

function PlayerScheduleView({ leagueId, userId }: { leagueId: string; userId: string }) {
  const [games, setGames] = useState<GameRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/games?leagueId=${leagueId}&userId=${userId}`)
      .then(r => r.json())
      .then(j => setGames(j.data ?? []))
      .finally(() => setLoading(false));
  }, [leagueId, userId]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const now = new Date();
  const upcoming = games.filter(g => new Date(g.scheduledAt) >= now);
  const past = games.filter(g => new Date(g.scheduledAt) < now);

  const renderGame = (game: GameRecord, i: number, arr: GameRecord[]) => {
    const { month, day, time } = formatDateTime(game.scheduledAt);
    const score = game.status === 'COMPLETED' && game.homeTeam != null
      ? null : null; // scores not yet tracked
    return (
      <div key={game.id} className={`flex items-center gap-4 py-4 ${i < arr.length - 1 ? 'border-b border-white/[0.06]' : ''}`}>
        <div className="text-center min-w-[56px]">
          <div className="text-xs text-gray-500 uppercase tracking-wide">{month}</div>
          <div className="text-xl font-black text-white">{day}</div>
          <div className="text-xs text-gray-400">{time}</div>
        </div>
        <div className="flex-1">
          <div className="font-medium text-white text-sm">
            {game.homeTeam.name} <span className="text-gray-500">vs</span> {game.awayTeam.name}
          </div>
          <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
            {game.location && <span>📍 {game.location}</span>}
            {game.season && <span>{game.season.name}</span>}
            {game.division && <span>· {game.division.name}</span>}
          </div>
        </div>
        <Badge variant={statusVariant[game.status]}>
          {game.status.charAt(0) + game.status.slice(1).toLowerCase()}
        </Badge>
      </div>
    );
  };

  if (!games.length) return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="text-5xl mb-4">📅</div>
      <h3 className="text-xl font-bold text-white mb-2">No games scheduled</h3>
      <p className="text-gray-400">Your games will appear here once the league director publishes a schedule.</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {upcoming.length > 0 && (
        <Card>
          <h3 className="text-base font-bold text-white mb-1">Upcoming Games</h3>
          <p className="text-sm text-gray-500 mb-4">{upcoming.length} game{upcoming.length !== 1 ? 's' : ''} ahead</p>
          <div>{upcoming.map((g, i, a) => renderGame(g, i, a))}</div>
        </Card>
      )}
      {past.length > 0 && (
        <Card>
          <h3 className="text-base font-bold text-white mb-1">Past Games</h3>
          <div className="opacity-70">{past.reverse().map((g, i, a) => renderGame(g, i, a))}</div>
        </Card>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SchedulePage({ params }: SchedulePageProps) {
  const { slug } = params;
  const sessionResult = useSession();
  const session = sessionResult?.data ?? null;
  const [league, setLeague] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    // Fetch both league and current user in parallel
    Promise.all([
      fetch(`/api/leagues/${slug}`).then(r => r.json()),
      fetch('/api/account').then(r => r.json()),
    ]).then(([leagueJson, accountJson]) => {
      if (leagueJson.error) throw new Error(leagueJson.error);
      setLeague(leagueJson.data);
      setCurrentUserId(accountJson?.data?.id ?? accountJson?.id ?? null);
    })
    .catch(e => setError(e.message))
    .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error || !league) return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">{error ?? 'League not found'}</div>
    </div>
  );

  const userId = currentUserId ?? (session?.user as any)?.id ?? null;
  // Compare ownerId — if session hasn't loaded yet, userId will be undefined
  // In that case show player view (safe default); it won't affect logged-in directors
  // since the league fetch itself requires auth
  const isDirector = !!userId && league.ownerId === userId;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl font-black text-white">Schedule</h2>
          <p className="text-gray-400">{isDirector ? 'Manage your league schedule' : 'Your upcoming and past games'}</p>
        </div>
      </div>

      {isDirector ? (
        <div className="space-y-8">
          <ScheduleBuilder
            leagueId={league.id}
            subscriptionTier={league.subscriptionTier}
            onSaved={() => setRefreshKey(k => k + 1)}
          />
          <div>
            <h3 className="text-lg font-bold text-white mb-4">All Scheduled Games</h3>
            <ExistingSchedules leagueId={league.id} refreshKey={refreshKey} />
          </div>
        </div>
      ) : (
        <PlayerScheduleView leagueId={league.id} userId={userId} />
      )}
    </div>
  );
}

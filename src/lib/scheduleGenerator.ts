/**
 * Schedule generation utilities for LeagueHQ.
 * Supports Round Robin, Single Elimination, and Double Elimination formats.
 */

export interface TeamRef {
  id: string;
  name: string;
}

export interface GameSlot {
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  scheduledAt: Date;
  location: string;
  round?: number;
  label?: string;
}

export type ScheduleType = 'ROUND_ROBIN' | 'SINGLE_ELIM' | 'DOUBLE_ELIM';

export interface ScheduleConfig {
  type: ScheduleType;
  teams: TeamRef[];
  startDate: string;
  endDate: string;
  gameDays: number[]; // 0=Sun, 1=Mon ... 6=Sat
  timeSlots: string[]; // e.g. ["6:00 PM", "8:00 PM"]
  location: string;
}

function nextGameDate(from: Date, gameDays: number[]): Date {
  const d = new Date(from);
  for (let i = 0; i < 14; i++) {
    if (gameDays.includes(d.getDay())) return d;
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/**
 * Parse a time string in HH:MM (24h) format from <input type="time">.
 * Falls back gracefully for legacy 12h strings just in case.
 */
function parseTime(timeStr: string): { hours: number; minutes: number } {
  // Primary: HH:MM 24h from input[type=time]
  const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) return { hours: parseInt(match24[1]), minutes: parseInt(match24[2]) };

  // Fallback: 12h with AM/PM (e.g. "9:00 AM", "9am")
  const match12 = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
  if (match12) {
    let hours = parseInt(match12[1]);
    const minutes = match12[2] ? parseInt(match12[2]) : 0;
    const meridiem = match12[3].toUpperCase();
    if (meridiem === 'PM' && hours !== 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return { hours, minutes };
  }

  return { hours: 18, minutes: 0 }; // default 6 PM
}

function withTime(date: Date, timeStr: string): Date {
  const { hours, minutes } = parseTime(timeStr);
  // Use UTC methods to avoid timezone drift when date came from an ISO date string
  const d = new Date(date);
  d.setUTCHours(hours, minutes, 0, 0);
  return d;
}

function makeSlotCursor(startDate: string, endDate: string, gameDays: number[], timeSlots: string[]) {
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  let currentDay = nextGameDate(new Date(startDate), gameDays);
  let slotIndex = 0;

  return {
    next(): Date | null {
      if (currentDay > end) return null;
      const dt = withTime(currentDay, timeSlots[slotIndex]);
      slotIndex++;
      if (slotIndex >= timeSlots.length) {
        slotIndex = 0;
        currentDay = new Date(currentDay);
        currentDay.setDate(currentDay.getDate() + 1);
        currentDay = nextGameDate(currentDay, gameDays);
      }
      return dt;
    },
  };
}

export function generateRoundRobin(config: ScheduleConfig): GameSlot[] {
  const { teams, startDate, endDate, gameDays, timeSlots, location } = config;
  if (teams.length < 2) return [];

  const slots: GameSlot[] = [];
  const cursor = makeSlotCursor(startDate, endDate, gameDays, timeSlots);

  const list = [...teams];
  if (list.length % 2 !== 0) list.push({ id: 'BYE', name: 'BYE' });

  const n = list.length;
  const rounds = n - 1;
  const half = n / 2;

  for (let round = 0; round < rounds; round++) {
    for (let i = 0; i < half; i++) {
      const home = list[i];
      const away = list[n - 1 - i];
      if (home.id === 'BYE' || away.id === 'BYE') continue;

      const dt = cursor.next();
      if (!dt) break;

      slots.push({
        homeTeamId: home.id,
        awayTeamId: away.id,
        homeTeamName: home.name,
        awayTeamName: away.name,
        scheduledAt: dt,
        location,
        round: round + 1,
        label: `Round ${round + 1}`,
      });
    }

    const last = list.splice(n - 1, 1)[0];
    list.splice(1, 0, last);
  }

  return slots;
}

export function generateSingleElim(config: ScheduleConfig): GameSlot[] {
  const { teams, startDate, endDate, gameDays, timeSlots, location } = config;
  if (teams.length < 2) return [];

  const cursor = makeSlotCursor(startDate, endDate, gameDays, timeSlots);
  const slots: GameSlot[] = [];

  let size = 1;
  while (size < teams.length) size *= 2;
  const bracket = [...teams];
  while (bracket.length < size) bracket.push({ id: 'BYE', name: 'BYE' });

  const totalRounds = Math.log2(size);

  const roundLabel = (n: number) => {
    const remaining = size / Math.pow(2, n - 1);
    if (remaining === 2) return 'Championship';
    if (remaining === 4) return 'Semifinal';
    if (remaining === 8) return 'Quarterfinal';
    return `Round ${n}`;
  };

  // Round 1
  for (let i = 0; i < size / 2; i++) {
    const home = bracket[i];
    const away = bracket[size - 1 - i];
    if (home.id === 'BYE' || away.id === 'BYE') continue;
    const dt = cursor.next();
    if (!dt) break;
    slots.push({
      homeTeamId: home.id, awayTeamId: away.id,
      homeTeamName: home.name, awayTeamName: away.name,
      scheduledAt: dt, location, round: 1, label: roundLabel(1),
    });
  }

  // Subsequent rounds TBD
  for (let round = 2; round <= totalRounds; round++) {
    const gamesInRound = size / Math.pow(2, round);
    for (let i = 0; i < gamesInRound; i++) {
      const dt = cursor.next();
      if (!dt) break;
      slots.push({
        homeTeamId: 'TBD', awayTeamId: 'TBD',
        homeTeamName: 'TBD', awayTeamName: 'TBD',
        scheduledAt: dt, location, round,
        label: `${roundLabel(round)} (TBD)`,
      });
    }
  }

  return slots;
}

export function generateDoubleElim(config: ScheduleConfig): GameSlot[] {
  const { teams, startDate, endDate, gameDays, timeSlots, location } = config;
  if (teams.length < 2) return [];

  const cursor = makeSlotCursor(startDate, endDate, gameDays, timeSlots);
  const slots: GameSlot[] = [];

  let size = 1;
  while (size < teams.length) size *= 2;
  const bracket = [...teams];
  while (bracket.length < size) bracket.push({ id: 'BYE', name: 'BYE' });

  const totalWinnerRounds = Math.log2(size);

  // Winners bracket R1
  for (let i = 0; i < size / 2; i++) {
    const home = bracket[i];
    const away = bracket[size - 1 - i];
    if (home.id === 'BYE' || away.id === 'BYE') continue;
    const dt = cursor.next();
    if (!dt) break;
    slots.push({
      homeTeamId: home.id, awayTeamId: away.id,
      homeTeamName: home.name, awayTeamName: away.name,
      scheduledAt: dt, location, round: 1, label: 'Winners R1',
    });
  }

  // Winners bracket subsequent rounds
  for (let round = 2; round <= totalWinnerRounds; round++) {
    const games = size / Math.pow(2, round);
    for (let i = 0; i < games; i++) {
      const dt = cursor.next();
      if (!dt) break;
      slots.push({
        homeTeamId: 'TBD', awayTeamId: 'TBD',
        homeTeamName: 'TBD', awayTeamName: 'TBD',
        scheduledAt: dt, location, round,
        label: round === totalWinnerRounds ? 'Winners Final (TBD)' : `Winners R${round} (TBD)`,
      });
    }
  }

  // Losers bracket
  for (let round = 1; round <= totalWinnerRounds; round++) {
    const games = Math.max(1, size / Math.pow(2, round));
    for (let i = 0; i < games; i++) {
      const dt = cursor.next();
      if (!dt) break;
      slots.push({
        homeTeamId: 'TBD', awayTeamId: 'TBD',
        homeTeamName: 'TBD', awayTeamName: 'TBD',
        scheduledAt: dt, location,
        round: totalWinnerRounds + round,
        label: round === totalWinnerRounds ? 'Losers Final (TBD)' : `Losers R${round} (TBD)`,
      });
    }
  }

  // Grand Final
  const gfDt = cursor.next();
  if (gfDt) {
    slots.push({
      homeTeamId: 'TBD', awayTeamId: 'TBD',
      homeTeamName: 'TBD', awayTeamName: 'TBD',
      scheduledAt: gfDt, location,
      round: totalWinnerRounds * 2 + 1,
      label: 'Grand Final (TBD)',
    });
  }

  return slots;
}

export function generateSchedule(config: ScheduleConfig): GameSlot[] {
  switch (config.type) {
    case 'ROUND_ROBIN': return generateRoundRobin(config);
    case 'SINGLE_ELIM': return generateSingleElim(config);
    case 'DOUBLE_ELIM': return generateDoubleElim(config);
    default: return [];
  }
}

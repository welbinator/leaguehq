// Utilities for persisting the active league selection client-side

const KEY = 'leaguehq_active_league';

export type ActiveLeague = {
  id: string;
  slug: string;
  name: string;
  sport: string;
  logoUrl: string | null;
  isDirector: boolean;
  isPlayer: boolean;
};

export function setActiveLeague(league: ActiveLeague) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(league));
}

export function getActiveLeague(): ActiveLeague | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearActiveLeague() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
}

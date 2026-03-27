import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// Role helpers — single source of truth for the entire app
// ─────────────────────────────────────────────────────────────────────────────
const DIRECTOR_ROLES = new Set(['LEAGUE_ADMIN', 'SUPER_ADMIN']);
const PLAYER_ROLES   = new Set(['PLAYER', 'CAPTAIN', 'COACH', 'REFEREE']);

function isDirector(role: string | undefined) { return DIRECTOR_ROLES.has(role ?? ''); }
function isPlayer(role: string | undefined)   { return PLAYER_ROLES.has(role ?? ''); }

// ─────────────────────────────────────────────────────────────────────────────
// Protected route map
//   key   = path prefix to match
//   value = { requireRole, redirectTo }
// ─────────────────────────────────────────────────────────────────────────────
const PROTECTED: {
  prefix: string;
  allow: (role: string | undefined) => boolean;
  redirect: string;
}[] = [
  // Director-only routes → players get sent to /dashboard/player
  {
    prefix: '/dashboard',
    allow: isDirector,
    redirect: '/dashboard/player',
  },
  // Player-only routes → directors get sent to /dashboard
  {
    prefix: '/dashboard/player',
    allow: (role) => isPlayer(role) || isDirector(role), // directors can peek
    redirect: '/dashboard',
  },
  // League sub-pages → must be logged in
  {
    prefix: '/leagues',
    allow: (role) => !!role,
    redirect: '/auth/signin',
  },
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Find the most specific matching rule (longest prefix first)
  const rule = PROTECTED
    .filter(r => pathname === r.prefix || pathname.startsWith(r.prefix + '/'))
    .sort((a, b) => b.prefix.length - a.prefix.length)[0];

  if (!rule) return NextResponse.next();

  const token = await getToken({ req: request });

  // Not logged in at all
  if (!token) {
    return NextResponse.redirect(new URL('/auth/signin', request.url));
  }

  const role = (token as any).role as string | undefined;

  // Wrong role for this route
  if (!rule.allow(role)) {
    return NextResponse.redirect(new URL(rule.redirect, request.url));
  }

  // /dashboard exact path: directors only
  if (pathname === '/dashboard' && !isDirector(role)) {
    return NextResponse.redirect(new URL('/dashboard/player', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard',
    '/dashboard/:path*',
    '/leagues/:path*',
  ],
};

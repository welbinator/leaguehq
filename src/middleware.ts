import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

  // Only intercept the exact /dashboard path
  if (pathname === '/dashboard') {
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }

    const role = (token as any).role;
    const isPlayer = role === 'PLAYER' || role === 'CAPTAIN' || role === 'COACH' || role === 'REFEREE';

    if (isPlayer) {
      return NextResponse.redirect(new URL('/dashboard/player', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard'],
};

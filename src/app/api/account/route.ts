import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// GET /api/account — fetch current user profile + owned leagues
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      firstName: true,
      lastName: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      zip: true,
      role: true,
      avatarUrl: true,
      subscriptionTier: true,
      subscriptionStatus: true,
      stripeSubscriptionId: true,
      createdAt: true,
      ownedLeagues: {
        select: {
          id: true,
          name: true,
          slug: true,
          sport: true,
          subscriptionTier: true,
          subscriptionStatus: true,
          stripeConnectAccountId: true,
        },
      },
      registrations: {
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          createdAt: true,
          teamId: true,
          team: {
            select: {
              id: true,
              name: true,
              captainId: true,
              division: { select: { name: true } },
              season: { select: { id: true, name: true } },
              league: { select: { name: true, slug: true, sport: true } },
            },
          },
          season: {
            select: {
              id: true,
              name: true,
              league: { select: { name: true, slug: true } },
            },
          },
        },
      },
      captainedTeams: {
        select: {
          id: true,
          name: true,
          captainId: true,
          division: { select: { name: true } },
          season: { select: { id: true, name: true } },
          league: { select: { name: true, slug: true, sport: true } },
          members: {
            select: {
              id: true,
              role: true,
              user: { select: { id: true, name: true, firstName: true, lastName: true } },
            },
          },
        },
      },
      teamMemberships: {
        where: { status: 'ACTIVE' },
        select: {
          id: true,
          role: true,
          team: {
            select: {
              id: true,
              name: true,
              captainId: true,
              division: { select: { name: true } },
              season: { select: { id: true, name: true } },
              league: { select: { name: true, slug: true, sport: true } },
            },
          },
        },
      },
    },
  });

  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  return NextResponse.json({ data: user });
}

// PATCH /api/account — update name or password
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const userId = (session.user as any).id;
  const body = await req.json();
  const { name, currentPassword, newPassword } = body;

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const updates: any = {};

  if (name?.trim()) updates.name = name.trim();

  // Profile fields
  const { firstName, lastName, phone, address, city, state, zip } = body;
  if (firstName !== undefined) updates.firstName = firstName?.trim() || null;
  if (lastName  !== undefined) updates.lastName  = lastName?.trim()  || null;
  if (phone     !== undefined) updates.phone     = phone?.trim()     || null;
  if (address   !== undefined) updates.address   = address?.trim()   || null;
  if (city      !== undefined) updates.city      = city?.trim()      || null;
  if (state     !== undefined) updates.state     = state?.trim()     || null;
  if (zip       !== undefined) updates.zip       = zip?.trim()       || null;

  if (newPassword) {
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
    }
    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters' }, { status: 400 });
    }
    updates.password = await bcrypt.hash(newPassword, 12);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: updates,
    select: { id: true, email: true, name: true, firstName: true, lastName: true, phone: true, address: true, city: true, state: true, zip: true, role: true, avatarUrl: true },
  });

  return NextResponse.json({ data: updated });
}

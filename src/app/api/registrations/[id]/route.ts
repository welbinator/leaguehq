import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// PATCH /api/registrations/[id] — update a registration (team assignment, status, etc.)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const body = await req.json();
  const { teamId, status, notes } = body;

  const registration = await prisma.registration.findUnique({ 
    where: { id }, 
    select: { leagueId: true, userId: true } 
  });
  if (!registration) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Verify requestor is the league director
  const league = await prisma.league.findUnique({ where: { id: registration.leagueId }, select: { ownerId: true } });
  if (league?.ownerId !== (session.user as any).id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { teamId, status, notes, name, email, phone } = body;

  // Update user profile fields if provided
  if (name || email || phone !== undefined) {
    const nameParts = name?.trim().split(' ') ?? [];
    await prisma.user.update({
      where: { id: registration.userId },
      data: {
        ...(name && { name: name.trim(), firstName: nameParts[0] ?? '', lastName: nameParts.slice(1).join(' ') || '' }),
        ...(email && { email }),
        ...(phone !== undefined && { phone: phone || null }),
      },
    });
  }

  const updated = await prisma.registration.update({
    where: { id },
    data: {
      ...(teamId !== undefined && { teamId: teamId || null }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
    },
  });

  return NextResponse.json({ data: updated });
}

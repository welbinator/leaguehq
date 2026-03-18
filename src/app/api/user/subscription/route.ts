import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/user/subscription — returns the current user's subscription status
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: (session.user as any).id },
    select: { subscriptionTier: true, subscriptionStatus: true },
  });

  const hasActivePlan =
    user?.subscriptionTier !== 'FREE' && user?.subscriptionStatus === 'ACTIVE';

  return NextResponse.json({
    subscriptionTier: user?.subscriptionTier ?? 'FREE',
    subscriptionStatus: user?.subscriptionStatus ?? null,
    hasActivePlan,
  });
}

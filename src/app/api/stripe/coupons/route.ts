import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import stripe from '@/lib/stripe';

// GET /api/stripe/coupons — list all coupons (league admins/super admins only)
export async function GET(req: NextRequest) {
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });

  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as any).role;
  if (!['SUPER_ADMIN', 'LEAGUE_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const coupons = await stripe.coupons.list({ limit: 100 });
  return NextResponse.json({ coupons: coupons.data });
}

// POST /api/stripe/coupons — create a coupon
// Body: { name, code, percentOff?, amountOff?, currency?, duration, durationInMonths? }
export async function POST(req: NextRequest) {
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });

  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as any).role;
  if (!['SUPER_ADMIN', 'LEAGUE_ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await req.json();
  const { name, code, percentOff, amountOff, currency, duration = 'once', durationInMonths } = body;

  if (!percentOff && !amountOff) {
    return NextResponse.json({ error: 'Either percentOff or amountOff is required' }, { status: 400 });
  }
  if (percentOff && (percentOff < 1 || percentOff > 100)) {
    return NextResponse.json({ error: 'percentOff must be between 1 and 100' }, { status: 400 });
  }

  try {
    const coupon = await stripe.coupons.create({
      name,
      percent_off: percentOff ?? undefined,
      amount_off: amountOff ? Math.round(amountOff * 100) : undefined,
      currency: amountOff ? (currency ?? 'usd') : undefined,
      duration,
      duration_in_months: duration === 'repeating' ? durationInMonths : undefined,
    });

    // Create a promotion code so users can enter it at checkout
    const promoCode = await stripe.promotionCodes.create({
      coupon: coupon.id,
      code: code ?? name.toUpperCase().replace(/\s+/g, ''),
    });

    return NextResponse.json({ coupon, promoCode });
  } catch (err: any) {
    console.error('[stripe/coupons] create error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/stripe/coupons?id=xxx — delete a coupon
export async function DELETE(req: NextRequest) {
  if (!stripe) return NextResponse.json({ error: 'Stripe not configured' }, { status: 500 });

  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = (session.user as any).role;
  if (role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: 'Only super admins can delete coupons' }, { status: 403 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  try {
    await stripe.coupons.del(id);
    return NextResponse.json({ deleted: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

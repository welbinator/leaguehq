import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// POST /api/auth/register-player — public, creates or verifies user account
export async function POST(req: NextRequest) {
  const { firstName, lastName, email, phone, address, city, state, zip, password } = await req.json();

  if (!firstName || !lastName || !email || !password) {
    return NextResponse.json({ error: 'First name, last name, email, and password are required' }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    const valid = await bcrypt.compare(password, existing.password);
    if (!valid) return NextResponse.json({ error: 'An account with this email already exists. Enter your password to continue.' }, { status: 409 });
    // Update profile fields if they provided new info
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        firstName: firstName || existing.firstName,
        lastName: lastName || existing.lastName,
        phone: phone || existing.phone,
        address: address || existing.address,
        city: city || existing.city,
        state: state || existing.state,
        zip: zip || existing.zip,
      },
    });
    return NextResponse.json({ data: { id: existing.id, email: existing.email, name: existing.name, isExisting: true } });
  }

  const hashed = await bcrypt.hash(password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      password: hashed,
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      phone: phone || null,
      address: address || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
      role: 'PLAYER',
    },
  });

  return NextResponse.json({ data: { id: user.id, email: user.email, name: user.name, isExisting: false } }, { status: 201 });
}

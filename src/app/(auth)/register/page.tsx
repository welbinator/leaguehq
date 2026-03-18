'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email: email.toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Registration failed. Please try again.');
        return;
      }

      // Auto sign in after registration
      const signInResult = await signIn('credentials', {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError('Account created, but sign in failed. Please log in manually.');
      } else {
        const params = new URLSearchParams(window.location.search);
        let nextUrl = params.get('next') ?? '/dashboard';
        // Re-append any extra params (e.g. plan) that weren't part of 'next'
        const plan = params.get('plan');
        if (plan && nextUrl.includes('/pricing')) {
          nextUrl += (nextUrl.includes('?') ? '&' : '?') + `plan=${plan}`;
        }
        router.push(nextUrl);
        router.refresh();
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface border-r border-white/[0.06] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-3xl" />
        </div>

        <Link href="/" className="relative flex items-center gap-2">
          <div className="w-9 h-9 bg-accent rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-2xl font-black text-white tracking-tight">
            League<span className="text-accent">HQ</span>
          </span>
        </Link>

        <div className="relative space-y-6">
          <h2 className="text-3xl font-black text-white leading-tight">
            Your league deserves<br />better tools.
          </h2>

          {[
            'Manage schedules in minutes, not hours',
            'Players register and pay online',
            'Standings update after every game',
            'Your whole league in one app',
          ].map((benefit) => (
            <div key={benefit} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                <svg className="w-3.5 h-3.5 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-gray-300">{benefit}</span>
            </div>
          ))}
        </div>

        <div className="relative text-sm text-gray-500">
          Start managing your league today
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16">
        <div className="max-w-md w-full mx-auto">
          <Link href="/" className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-black text-white">League<span className="text-accent">HQ</span></span>
          </Link>

          <h1 className="text-3xl font-black text-white mb-2">Create your account</h1>
          <p className="text-gray-400 mb-8">
            Already have one?{' '}
            <Link href="/login" className="text-accent hover:text-accent-light transition-colors">
              Sign in
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Alex Thompson"
              required
              autoComplete="name"
            />
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete="new-password"
              hint="At least 8 characters"
            />

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              loading={loading}
              className="w-full mt-2"
            >
              Create Account
            </Button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-8">
            By creating an account you agree to our{' '}
            <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

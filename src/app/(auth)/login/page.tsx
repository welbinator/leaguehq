'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await signIn('credentials', {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
      } else {
        router.push('/dashboard');
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
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-surface border-r border-white/[0.06] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-blue-500/5 rounded-full blur-3xl" />
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

        <div className="relative">
          <blockquote className="text-2xl font-bold text-white leading-snug mb-4">
            "LeagueHQ saved us 10 hours a week. Our players love the app, and scheduling is finally painless."
          </blockquote>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-accent/20 rounded-full flex items-center justify-center text-accent font-bold">
              M
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Marcus Johnson</p>
              <p className="text-xs text-gray-400">Director, Cedar Rapids Adult Soccer League</p>
            </div>
          </div>
        </div>

        <div className="relative flex items-center gap-6 text-sm text-gray-500">
          <span>500+ leagues</span>
          <span>·</span>
          <span>25,000+ players</span>
          <span>·</span>
          <span>98% uptime</span>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-16">
        <div className="max-w-md w-full mx-auto">
          {/* Mobile logo */}
          <Link href="/" className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-black text-white">League<span className="text-accent">HQ</span></span>
          </Link>

          <h1 className="text-3xl font-black text-white mb-2">Welcome back</h1>
          <p className="text-gray-400 mb-8">
            Sign in to manage your leagues.{' '}
            <Link href="/register" className="text-accent hover:text-accent-light transition-colors">
              Need an account?
            </Link>
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />
            <div>
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
              <div className="mt-1 flex justify-end">
                <Link href="/forgot-password" className="text-xs text-gray-400 hover:text-accent transition-colors">
                  Forgot password?
                </Link>
              </div>
            </div>

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
              Sign In
            </Button>
          </form>

          <p className="text-center text-xs text-gray-500 mt-8">
            By signing in you agree to our{' '}
            <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

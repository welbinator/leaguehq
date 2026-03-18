'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PRICING_TIERS } from '@/types';

export const dynamic = 'force-dynamic';

export default function PricingPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSelect(tierId: string) {
    if (!session?.user) {
      router.push(`/register?next=/pricing&plan=${tierId}`);
      return;
    }
    setLoading(tierId);
    setError(null);
    try {
      const res = await fetch('/api/stripe/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tierId }),
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        setError(json.error ?? 'Something went wrong');
        setLoading(null);
      }
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <div className="pt-32 pb-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-black text-white mb-4">Simple, transparent pricing</h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Everything you need to run a professional league. Pick the plan that fits your size.
            </p>
          </div>

          {error && (
            <div className="max-w-lg mx-auto mb-8 bg-red-500/10 border border-red-500/20 rounded-xl px-5 py-4 text-red-400 text-sm text-center">{error}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`relative bg-surface rounded-2xl p-8 flex flex-col ${
                  tier.highlighted
                    ? 'border-2 border-accent shadow-2xl shadow-accent/10 scale-105'
                    : 'border border-white/[0.06]'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-accent text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">${tier.price}</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    {tier.maxPlayers ? `Up to ${tier.maxPlayers.toLocaleString()} players` : 'Unlimited players'}
                  </p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${tier.highlighted ? 'text-accent' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelect(tier.id)}
                  disabled={loading === tier.id}
                  className={`w-full font-bold py-3 px-6 rounded-xl transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed ${
                    tier.highlighted
                      ? 'bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/25'
                      : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                  }`}
                >
                  {loading === tier.id ? 'Redirecting…' : 'Get Started'}
                </button>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-500 mt-10">
            Prices in USD. Cancel anytime. Questions?{' '}
            <a href="mailto:support@leaguehq.club" className="text-accent hover:underline">Contact us</a>
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
}

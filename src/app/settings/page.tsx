'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Sidebar } from '@/components/layout/Sidebar';
import { StripeConnectCard } from '@/components/stripe/StripeConnectCard';

const SPORT_EMOJI: Record<string, string> = {
  Soccer: '⚽', Basketball: '🏀', Baseball: '⚾', Football: '🏈',
  Volleyball: '🏐', Tennis: '🎾', Hockey: '🏒', Softball: '🥎',
  Lacrosse: '🥍', Rugby: '🏉', Other: '🏆',
};



interface League {
  id: string;
  name: string;
  slug: string;
  sport: string;
  stripeConnectAccountId: string | null;
}

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), type === 'error' ? 15000 : 3500);
  }

  async function loadLeagues() {
    const res = await fetch('/api/leagues');
    const json = await res.json();
    const data: League[] = json.data ?? [];
    setLeagues(data);
    setLoading(false);
  }

  useEffect(() => {
    fetch('/api/account').then(r => r.json()).then(j => {
      const role = j.data?.role;
      if (role === 'PLAYER' || role === 'CAPTAIN' || role === 'COACH' || role === 'REFEREE') {
        router.replace('/dashboard/player');
      }
    }).catch(() => {});
  }, [router]);

  useEffect(() => { loadLeagues(); }, []);

  // Handle return from Stripe onboarding
  useEffect(() => {
    const leagueId = searchParams.get('league');
    if (searchParams.get('connect_success') === '1' && leagueId) {
      showToast('Stripe connected successfully!');
      fetch(`/api/stripe/connect/status?leagueId=${leagueId}`)
                .then(r => r.json())
        .then(() => { /* StripeConnectCard handles its own status */ });
    }
    if (searchParams.get('connect_refresh') === '1') {
      const errMsg = searchParams.get('error');
      showToast(errMsg ? `Stripe error: ${errMsg}` : 'Connection cancelled or incomplete — please try again.', 'error');
    }
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-navy flex">
      <Sidebar />

      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 font-semibold px-4 py-3 rounded-lg shadow-lg text-sm animate-fade-in max-w-sm cursor-pointer select-text ${
            toastType === 'success' ? 'bg-accent text-navy' : 'bg-red-500 text-white'
          }`}
          onClick={() => setToast(null)}
        >
          <div className="flex items-start gap-2">
            <span className="flex-1 break-all">{toast}</span>
            <span className="opacity-60 text-xs flex-shrink-0 mt-0.5">✕</span>
          </div>
          {toastType === 'error' && <div className="text-xs opacity-60 mt-1">Click to dismiss</div>}
        </div>
      )}

      <main className="flex-1 ml-14 md:ml-64 p-6 sm:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-2xl font-black text-white">Settings</h1>
            <p className="text-gray-400 text-sm mt-0.5">Manage payments and configuration for your leagues</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : leagues.length === 0 ? (
            <Card>
              <div className="text-center py-10">
                <div className="text-4xl mb-3">🏆</div>
                <p className="text-gray-400 text-sm mb-4">You don't have any leagues yet.</p>
                <Link href="/dashboard" className="text-accent hover:underline text-sm">Create a league →</Link>
              </div>
            </Card>
          ) : (
            <>
              {/* Stripe Payments Section */}
              <Card>
                <h2 className="text-lg font-bold text-white mb-1">Stripe Payments</h2>
                <p className="text-gray-400 text-sm mb-5">
                  Connect Stripe to each league so players can pay registration fees directly to you.
                </p>
                <div className="space-y-6">
                  {leagues.map(league => (
                    <div key={league.id} className="p-4 bg-navy rounded-xl border border-white/10">
                      <div className="flex items-center gap-3 mb-4">
                        <span className="text-2xl">{SPORT_EMOJI[league.sport] ?? '🏆'}</span>
                        <Link href={`/leagues/${league.slug}`} className="text-white font-semibold hover:text-accent transition-colors text-sm">
                          {league.name}
                        </Link>
                      </div>
                      <StripeConnectCard league={league} />
                    </div>
                  ))}
                </div>
              </Card>

              {/* More settings sections can go here */}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}

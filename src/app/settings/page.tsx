'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Sidebar } from '@/components/layout/Sidebar';

const SPORT_EMOJI: Record<string, string> = {
  Soccer: '⚽', Basketball: '🏀', Baseball: '⚾', Football: '🏈',
  Volleyball: '🏐', Tennis: '🎾', Hockey: '🏒', Softball: '🥎',
  Lacrosse: '🥍', Rugby: '🏉', Other: '🏆',
};

interface StripeStatus {
  connected: boolean;
  complete: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
}

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
  const [stripeStatuses, setStripeStatuses] = useState<Record<string, StripeStatus>>({});
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);
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

    // Load Stripe status for each league in parallel
    const statuses: Record<string, StripeStatus> = {};
    await Promise.all(
      data.map(async (league) => {
        try {
          const r = await fetch(`/api/stripe/connect/status?leagueId=${league.id}`);
          const s = await r.json();
          statuses[league.id] = s;
        } catch {
          statuses[league.id] = { connected: false, complete: false };
        }
      })
    );
    setStripeStatuses(statuses);
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
        .then(s => setStripeStatuses(prev => ({ ...prev, [leagueId]: s })));
    }
    if (searchParams.get('connect_refresh') === '1') {
      const errMsg = searchParams.get('error');
      showToast(errMsg ? `Stripe error: ${errMsg}` : 'Connection cancelled or incomplete — please try again.', 'error');
    }
  }, [searchParams]);

  async function connectStripe(league: League) {
    setConnecting(league.id);
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId: league.id }),
      });
      const json = await res.json();
      if (json.url) {
        window.location.href = json.url;
      } else {
        showToast(json.error ?? 'Failed to start Stripe onboarding', 'error');
        setConnecting(null);
      }
    } catch {
      showToast('Something went wrong', 'error');
      setConnecting(null);
    }
  }

  async function disconnectStripe(league: League) {
    if (!confirm(`Disconnect Stripe from ${league.name}? Players won't be able to pay until you reconnect.`)) return;
    setDisconnecting(league.id);
    try {
      const res = await fetch('/api/stripe/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId: league.id }),
      });
      const json = await res.json();
      if (json.success) {
        setStripeStatuses(prev => ({ ...prev, [league.id]: { connected: false, complete: false } }));
        showToast('Stripe disconnected.');
      } else {
        showToast(json.error ?? 'Failed to disconnect', 'error');
      }
    } finally {
      setDisconnecting(null);
    }
  }

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

                <div className="space-y-4">
                  {leagues.map(league => {
                    const status = stripeStatuses[league.id];
                    const fullyConnected = status?.connected && status?.complete && status?.chargesEnabled;
                    const incompleteSetup = status?.connected && (!status?.complete || !status?.chargesEnabled);
                    const isConnecting = connecting === league.id;
                    const isDisconnecting = disconnecting === league.id;

                    return (
                      <div key={league.id} className="p-4 bg-navy rounded-xl border border-white/10">
                        <div className="flex items-center justify-between gap-4 flex-wrap">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{SPORT_EMOJI[league.sport] ?? '🏆'}</span>
                            <div>
                              <Link href={`/leagues/${league.slug}`} className="text-white font-semibold hover:text-accent transition-colors text-sm">
                                {league.name}
                              </Link>
                              <div className="mt-1">
                                {!status ? (
                                  <span className="text-xs text-gray-500">Checking...</span>
                                ) : fullyConnected ? (
                                  <Badge variant="success" dot>Connected</Badge>
                                ) : incompleteSetup ? (
                                  <Badge variant="warning" dot>Setup Incomplete</Badge>
                                ) : (
                                  <Badge variant="default" dot>Not Connected</Badge>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {fullyConnected ? (
                              <>
                                <span className="text-xs text-gray-500 flex items-center gap-1.5">
                                  <span className="text-accent">✓</span> Charges enabled
                                </span>
                                <button
                                  onClick={() => disconnectStripe(league)}
                                  disabled={isDisconnecting}
                                  className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                                >
                                  {isDisconnecting ? 'Disconnecting...' : 'Disconnect'}
                                </button>
                              </>
                            ) : incompleteSetup ? (
                              <Button onClick={() => connectStripe(league)} loading={isConnecting}>
                                Resume Setup →
                              </Button>
                            ) : (
                              <Button onClick={() => connectStripe(league)} loading={isConnecting}>
                                Connect Stripe →
                              </Button>
                            )}
                          </div>
                        </div>

                        {incompleteSetup && (
                          <p className="text-xs text-yellow-400/80 mt-3 pl-11">
                            ⚠️ Complete Stripe onboarding to start accepting payments
                          </p>
                        )}
                      </div>
                    );
                  })}
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

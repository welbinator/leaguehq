'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { LeagueNav } from '@/components/league/LeagueNav';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

const SPORTS = [
  'Soccer','Basketball','Baseball','Football','Volleyball',
  'Tennis','Hockey','Softball','Lacrosse','Rugby','Other',
];

interface StripeStatus {
  connected: boolean;
  complete: boolean;
  chargesEnabled?: boolean;
  payoutsEnabled?: boolean;
  accountId?: string;
}

interface SettingsPageProps {
  params: { slug: string };
}

export default function SettingsPage({ params }: SettingsPageProps) {
  const { slug } = params;
  const searchParams = useSearchParams();
  const [league, setLeague] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stripeStatus, setStripeStatus] = useState<StripeStatus | null>(null);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // League info edit state
  const [name, setName] = useState('');
  const [sport, setSport] = useState('');
  const [description, setDescription] = useState('');
  const [savingInfo, setSavingInfo] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3500);
  }

  const loadStripeStatus = useCallback(async (leagueId: string) => {
    setStripeLoading(true);
    try {
      const res = await fetch(`/api/stripe/connect/status?leagueId=${leagueId}`);
      const json = await res.json();
      setStripeStatus(json);
    } finally {
      setStripeLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch(`/api/leagues/${slug}`)
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          const l = json.data;
          setLeague(l);
          setName(l.name);
          setSport(l.sport);
          setDescription(l.description ?? '');
          loadStripeStatus(l.id);
        }
      })
      .finally(() => setLoading(false));
  }, [slug, loadStripeStatus]);

  // Handle redirect back from Stripe onboarding
  useEffect(() => {
    if (searchParams.get('connect_success') === '1') {
      showToast('Stripe connected successfully!');
      if (league?.id) loadStripeStatus(league.id);
    }
    if (searchParams.get('connect_error')) {
      showToast('Stripe connection failed: ' + searchParams.get('connect_error'), 'error');
    }
  }, [searchParams, league?.id, loadStripeStatus]);

  async function saveLeagueInfo() {
    setSavingInfo(true);
    try {
      const res = await fetch(`/api/leagues/${league.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, sport, description }),
      });
      const json = await res.json();
      if (json.data) {
        setLeague((l: any) => ({ ...l, ...json.data }));
        showToast('League info updated!');
      } else {
        showToast(json.error ?? 'Failed to save', 'error');
      }
    } finally {
      setSavingInfo(false);
    }
  }

  async function connectStripe() {
    setConnectingStripe(true);
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
        setConnectingStripe(false);
      }
    } catch {
      showToast('Something went wrong', 'error');
      setConnectingStripe(false);
    }
  }

  async function disconnectStripe() {
    if (!confirm('Disconnect Stripe? Players will no longer be able to pay for this league.')) return;
    setDisconnecting(true);
    try {
      const res = await fetch('/api/stripe/connect', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId: league.id }),
      });
      const json = await res.json();
      if (json.ok) {
        setStripeStatus({ connected: false, complete: false });
        showToast('Stripe disconnected.');
      } else {
        showToast(json.error ?? 'Failed to disconnect', 'error');
      }
    } finally {
      setDisconnecting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!league) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 mb-4">League not found.</p>
          <Link href="/dashboard" className="text-accent hover:underline text-sm">← Dashboard</Link>
        </div>
      </div>
    );
  }

  const stripeFullyConnected = stripeStatus?.connected && stripeStatus?.complete && stripeStatus?.chargesEnabled;

  return (
    <div className="min-h-screen bg-navy">
      <LeagueNav slug={slug} />

      {toast && (
        <div className={`fixed top-4 right-4 z-50 font-semibold px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in ${
          toastType === 'success' ? 'bg-accent text-navy' : 'bg-red-500 text-white'
        }`}>
          {toast}
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-black text-white">League Settings</h1>
          <p className="text-gray-400 text-sm mt-0.5">Manage your league info and payments</p>
        </div>

        {/* League Info */}
        <Card>
          <h2 className="text-lg font-bold text-white mb-5">League Info</h2>
          <div className="space-y-4">
            <Input
              label="League Name"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Sport</label>
              <select
                className="w-full bg-navy border border-white/10 rounded-lg text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                value={sport}
                onChange={e => setSport(e.target.value)}
              >
                {SPORTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">Description <span className="text-gray-500">(optional)</span></label>
              <textarea
                className="w-full bg-navy border border-white/10 rounded-lg text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
                rows={3}
                placeholder="Tell players about your league..."
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={saveLeagueInfo} loading={savingInfo}>Save Changes</Button>
            </div>
          </div>
        </Card>

        {/* Stripe Connect */}
        <Card>
          <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Payments</h2>
              <p className="text-gray-400 text-sm mt-0.5">Connect Stripe to collect registration fees from players</p>
            </div>
            {stripeLoading ? (
              <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin mt-1" />
            ) : stripeFullyConnected ? (
              <Badge variant="success" dot>Connected</Badge>
            ) : stripeStatus?.connected && !stripeStatus?.complete ? (
              <Badge variant="warning" dot>Setup Incomplete</Badge>
            ) : (
              <Badge variant="default" dot>Not Connected</Badge>
            )}
          </div>

          {!stripeLoading && (
            <>
              {/* Not connected at all */}
              {!stripeStatus?.connected && (
                <div className="p-5 bg-navy rounded-xl border border-white/10 text-center space-y-4">
                  <div className="text-4xl">💳</div>
                  <div>
                    <p className="text-white font-medium">Connect your Stripe account</p>
                    <p className="text-gray-400 text-sm mt-1">
                      Players will pay you directly via Stripe. LeagueHQ takes a small platform fee per transaction.
                    </p>
                  </div>
                  <Button onClick={connectStripe} loading={connectingStripe}>
                    Connect Stripe →
                  </Button>
                </div>
              )}

              {/* Connected but onboarding incomplete */}
              {stripeStatus?.connected && !stripeStatus?.complete && (
                <div className="p-5 bg-yellow-500/10 rounded-xl border border-yellow-500/30 space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">⚠️</span>
                    <div>
                      <p className="text-yellow-300 font-medium">Onboarding incomplete</p>
                      <p className="text-yellow-400/70 text-sm mt-1">
                        Your Stripe account is connected but you haven't finished the setup. Complete it to start accepting payments.
                      </p>
                    </div>
                  </div>
                  <Button onClick={connectStripe} loading={connectingStripe}>
                    Resume Stripe Setup →
                  </Button>
                </div>
              )}

              {/* Fully connected */}
              {stripeFullyConnected && (
                <div className="space-y-4">
                  <div className="p-4 bg-accent/5 rounded-xl border border-accent/20 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                      <span className="text-sm font-medium text-white">Stripe account connected</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className={stripeStatus.chargesEnabled ? 'text-accent' : 'text-red-400'}>
                          {stripeStatus.chargesEnabled ? '✓' : '✗'}
                        </span>
                        <span className="text-gray-400">Charges enabled</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={stripeStatus.payoutsEnabled ? 'text-accent' : 'text-red-400'}>
                          {stripeStatus.payoutsEnabled ? '✓' : '✗'}
                        </span>
                        <span className="text-gray-400">Payouts enabled</span>
                      </div>
                    </div>
                    {stripeStatus.accountId && (
                      <p className="text-xs text-gray-600 font-mono">{stripeStatus.accountId}</p>
                    )}
                  </div>
                  {/* Webhook setup instructions */}
                  <div className="p-4 bg-navy rounded-xl border border-white/10 space-y-3">
                    <div className="flex items-start gap-2">
                      <span className="text-lg">🔔</span>
                      <div>
                        <p className="text-sm font-semibold text-white">One-time webhook setup required</p>
                        <p className="text-gray-400 text-xs mt-1">
                          To receive payment confirmations, add a webhook endpoint in your Stripe dashboard.
                        </p>
                      </div>
                    </div>
                    <ol className="space-y-2 text-xs text-gray-400 list-none pl-0">
                      <li className="flex gap-2">
                        <span className="text-accent font-bold flex-shrink-0">1.</span>
                        <span>Go to <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Stripe Dashboard → Developers → Webhooks</a> and click <strong className="text-white">Add destination</strong></span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-accent font-bold flex-shrink-0">2.</span>
                        <span>
                          Set the endpoint URL to:{' '}
                          <code className="bg-white/5 px-1.5 py-0.5 rounded text-white font-mono select-all">
                            https://leaguehq.club/api/stripe/webhook
                          </code>
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-accent font-bold flex-shrink-0">3.</span>
                        <span>
                          Select these events to listen for:
                          <ul className="mt-1.5 space-y-1 pl-2">
                            {['checkout.session.completed','customer.subscription.updated','customer.subscription.deleted','invoice.payment_failed'].map(e => (
                              <li key={e} className="flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-accent flex-shrink-0" />
                                <code className="font-mono text-white/80">{e}</code>
                              </li>
                            ))}
                          </ul>
                        </span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-accent font-bold flex-shrink-0">4.</span>
                        <span>After saving, copy the <strong className="text-white">Signing Secret</strong> (<code className="font-mono">whsec_...</code>) and add it as the <code className="font-mono text-white">STRIPE_WEBHOOK_SECRET</code> environment variable in your Railway dashboard.</span>
                      </li>
                    </ol>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={disconnectStripe}
                      disabled={disconnecting}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors disabled:opacity-50"
                    >
                      {disconnecting ? 'Disconnecting...' : 'Disconnect Stripe'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {/* Danger Zone */}
        <Card>
          <h2 className="text-lg font-bold text-white mb-1">Danger Zone</h2>
          <p className="text-gray-400 text-sm mb-5">Irreversible actions — be careful</p>
          <div className="p-4 border border-red-500/20 rounded-xl flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-medium text-white">Delete this league</p>
              <p className="text-xs text-gray-400 mt-0.5">Permanently removes all seasons, teams, and registrations</p>
            </div>
            <button className="text-xs text-red-400 border border-red-500/30 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-all">
              Delete League
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

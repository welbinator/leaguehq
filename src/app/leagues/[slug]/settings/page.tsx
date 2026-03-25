'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';

interface League {
  id: string;
  name: string;
  slug: string;
  sport: string;
  ownerId: string;
  teamChatsEnabled: boolean;
  stripeConnectAccountId: string | null;
}

function Toggle({ enabled, onToggle, loading, label, description }: {
  enabled: boolean;
  onToggle: () => void;
  loading: boolean;
  label: string;
  description: string;
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/[0.08]">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{description}</p>
      </div>
      <button
        onClick={onToggle}
        disabled={loading}
        className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-4 disabled:opacity-50 ${
          enabled ? 'bg-accent' : 'bg-white/10'
        }`}
      >
        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
          enabled ? 'left-6' : 'left-1'
        }`} />
      </button>
    </div>
  );
}

export default function LeagueSettingsPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [league, setLeague] = useState<League | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [stripeStatus, setStripeStatus] = useState<{ connected: boolean; complete: boolean; chargesEnabled?: boolean } | null>(null);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [disconnectingStripe, setDisconnectingStripe] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [broadcastAudience, setBroadcastAudience] = useState<'all' | 'league' | 'season'>('league');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  useEffect(() => {
    Promise.all([
      fetch(`/api/leagues/${slug}`).then(r => r.json()),
      fetch('/api/account').then(r => r.json()),
    ]).then(([leagueJson, accountJson]) => {
      if (leagueJson.data) {
        setLeague(leagueJson.data);
        // Load Stripe status
        fetch(`/api/stripe/connect/status?leagueId=${leagueJson.data.id}`)
          .then(r => r.json())
          .then(s => setStripeStatus(s))
          .catch(() => setStripeStatus({ connected: false, complete: false }));
      }
      setCurrentUserId(accountJson?.data?.id ?? null);
    }).finally(() => setLoading(false));
  }, [slug]);

  const isDirector = !!currentUserId && league?.ownerId === currentUserId;

  async function toggle(field: 'teamChatsEnabled', value: boolean) {
    if (!league) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leagues/${league.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value }),
      });
      const json = await res.json();
      if (res.ok) {
        setLeague(prev => prev ? { ...prev, [field]: value } : prev);
        showToast('Saved!');
      } else {
        showToast(json.error ?? 'Failed to save');
      }
    } finally {
      setSaving(false);
    }
  }

  async function sendBroadcast() {
    if (!broadcastTitle.trim() || !broadcastBody.trim() || !league) return;
    setSending(true);
    try {
      const res = await fetch('/api/push/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: broadcastTitle.trim(),
          body: broadcastBody.trim(),
          audience: broadcastAudience,
          leagueId: league.id,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        showToast(`Sent to ${json.sent ?? 0} players!`);
        setBroadcastTitle('');
        setBroadcastBody('');
      } else {
        showToast(json.error ?? 'Failed to send');
      }
    } finally {
      setSending(false);
    }
  }

  async function connectStripe() {
    if (!league) return;
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
        showToast(json.error ?? 'Failed to start Stripe onboarding');
      }
    } finally {
      setConnectingStripe(false);
    }
  }

  async function disconnectStripe() {
    if (!league || !confirm(`Disconnect Stripe from ${league.name}? Players won't be able to pay until you reconnect.`)) return;
    setDisconnectingStripe(true);
    try {
      const res = await fetch('/api/stripe/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId: league.id }),
      });
      const json = await res.json();
      if (json.success) {
        setStripeStatus({ connected: false, complete: false });
        showToast('Stripe disconnected.');
      } else {
        showToast(json.error ?? 'Failed to disconnect');
      }
    } finally {
      setDisconnectingStripe(false);
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!isDirector) return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
        You don&apos;t have permission to access league settings.
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-accent text-navy font-semibold px-4 py-2 rounded-lg shadow-lg text-sm">
          {toast}
        </div>
      )}
      <div className="mb-8">
        <h2 className="text-2xl font-black text-white">League Settings</h2>
        <p className="text-gray-400 mt-1">{league?.name}</p>
      </div>

      <Card>
        <h3 className="text-base font-bold text-white mb-4">💬 Chat</h3>
        <div className="space-y-3">
          <Toggle
            enabled={league?.teamChatsEnabled ?? false}
            onToggle={() => toggle('teamChatsEnabled', !league?.teamChatsEnabled)}
            loading={saving}
            label="Team Chats"
            description="Each team gets a private chat room. All team members are added automatically."
          />
        </div>
      </Card>

      <div className="mt-6">
        <Card>
          <h3 className="text-base font-bold text-white mb-1">💳 Stripe Payments</h3>
          <p className="text-gray-400 text-xs mb-4">Connect Stripe so players can pay registration fees directly to you.</p>

          {stripeStatus === null ? (
            <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
              <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
              Checking status…
            </div>
          ) : stripeStatus.connected && stripeStatus.complete && stripeStatus.chargesEnabled ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-accent" />
                  <span className="text-sm text-white font-medium">Connected</span>
                  <span className="text-xs text-gray-500">· Charges enabled</span>
                </div>
                <button
                  onClick={disconnectStripe}
                  disabled={disconnectingStripe}
                  className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
                >
                  {disconnectingStripe ? 'Disconnecting…' : 'Disconnect'}
                </button>
              </div>

              {/* Webhook instructions */}
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
                      Select these events:
                      <ul className="mt-1.5 space-y-1 pl-2">
                        {['checkout.session.completed', 'customer.subscription.updated', 'customer.subscription.deleted', 'invoice.payment_failed'].map(e => (
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
                    <span>After saving, copy the <strong className="text-white">Signing Secret</strong> (<code className="font-mono">whsec_…</code>) and add it as <code className="font-mono text-white">STRIPE_WEBHOOK_SECRET</code> in your Railway environment variables.</span>
                  </li>
                </ol>
              </div>
            </div>
          ) : stripeStatus.connected && (!stripeStatus.complete || !stripeStatus.chargesEnabled) ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-sm text-yellow-300 font-medium">Setup incomplete</span>
              </div>
              <p className="text-xs text-gray-400">Complete Stripe onboarding to start accepting payments.</p>
              <button
                onClick={connectStripe}
                disabled={connectingStripe}
                className="text-sm bg-accent hover:bg-accent/90 disabled:opacity-50 text-navy font-bold px-4 py-2 rounded-lg transition-colors"
              >
                {connectingStripe ? 'Redirecting…' : 'Resume Setup →'}
              </button>
            </div>
          ) : (
            <button
              onClick={connectStripe}
              disabled={connectingStripe}
              className="text-sm bg-accent hover:bg-accent/90 disabled:opacity-50 text-navy font-bold px-4 py-2 rounded-lg transition-colors"
            >
              {connectingStripe ? 'Redirecting…' : 'Connect Stripe →'}
            </button>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <h3 className="text-base font-bold text-white mb-4">📣 Send Notification</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Audience</label>
              <select
                value={broadcastAudience}
                onChange={e => setBroadcastAudience(e.target.value as any)}
                className="mt-1 w-full bg-navy border border-white/10 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-accent/50"
              >
                <option value="league">All players in this league</option>
                <option value="all">All players across all my leagues</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Title</label>
              <input
                value={broadcastTitle}
                onChange={e => setBroadcastTitle(e.target.value)}
                placeholder="e.g. Game cancelled tonight"
                className="mt-1 w-full bg-navy border border-white/10 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-accent/50 placeholder-gray-600"
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 font-medium uppercase tracking-wide">Message</label>
              <textarea
                value={broadcastBody}
                onChange={e => setBroadcastBody(e.target.value)}
                placeholder="e.g. Due to weather, tonight's game at 7pm is cancelled."
                rows={3}
                className="mt-1 w-full bg-navy border border-white/10 text-white text-sm rounded-xl px-3 py-2 focus:outline-none focus:border-accent/50 placeholder-gray-600 resize-none"
              />
            </div>
            <button
              onClick={sendBroadcast}
              disabled={!broadcastTitle.trim() || !broadcastBody.trim() || sending}
              className="w-full bg-accent hover:bg-accent/90 disabled:opacity-40 text-navy font-bold py-2.5 rounded-xl text-sm transition-colors"
            >
              {sending ? 'Sending…' : 'Send Notification'}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';

interface League {
  id: string;
  name: string;
  stripeConnectAccountId: string | null;
}

interface StripeStatus {
  connected: boolean;
  complete: boolean;
  chargesEnabled?: boolean;
}

interface Props {
  league: League;
  /** Optional: called after connect/disconnect so parent can refresh state */
  onStatusChange?: (status: StripeStatus) => void;
}

export function StripeConnectCard({ league, onStatusChange }: Props) {
  const [status, setStatus] = useState<StripeStatus | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), type === 'error' ? 10000 : 3500);
  }

  useEffect(() => {
    fetch(`/api/stripe/connect/status?leagueId=${league.id}`)
      .then(r => r.json())
      .then(s => { setStatus(s); onStatusChange?.(s); })
      .catch(() => setStatus({ connected: false, complete: false }));
  }, [league.id]);

  async function connectStripe() {
    setConnecting(true);
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
        setConnecting(false);
      }
    } catch {
      showToast('Something went wrong', 'error');
      setConnecting(false);
    }
  }

  async function disconnectStripe() {
    if (!confirm(`Disconnect Stripe from ${league.name}? Players won't be able to pay until you reconnect.`)) return;
    setDisconnecting(true);
    try {
      const res = await fetch('/api/stripe/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leagueId: league.id }),
      });
      const json = await res.json();
      if (json.success) {
        const newStatus = { connected: false, complete: false };
        setStatus(newStatus);
        onStatusChange?.(newStatus);
        showToast('Stripe disconnected.');
      } else {
        showToast(json.error ?? 'Failed to disconnect', 'error');
      }
    } finally {
      setDisconnecting(false);
    }
  }

  const fullyConnected = status?.connected && status?.complete && status?.chargesEnabled;
  const incompleteSetup = status?.connected && (!status?.complete || !status?.chargesEnabled);

  return (
    <div className="space-y-3">
      {toast && (
        <div
          className={`px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer ${
            toast.type === 'success' ? 'bg-accent text-navy' : 'bg-red-500 text-white'
          }`}
          onClick={() => setToast(null)}
        >
          {toast.msg}
        </div>
      )}

      {status === null ? (
        <div className="flex items-center gap-2 text-gray-500 text-sm py-2">
          <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
          Checking status…
        </div>
      ) : fullyConnected ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-sm text-white font-medium">Connected</span>
              <span className="text-xs text-gray-500">· Charges enabled</span>
            </div>
            <button
              onClick={disconnectStripe}
              disabled={disconnecting}
              className="text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50"
            >
              {disconnecting ? 'Disconnecting…' : 'Disconnect'}
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
                <span>
                  Go to{' '}
                  <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
                    Stripe Dashboard → Developers → Webhooks
                  </a>{' '}
                  and click <strong className="text-white">Add destination</strong>
                </span>
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
                <span>
                  After saving, copy the <strong className="text-white">Signing Secret</strong>{' '}
                  (<code className="font-mono">whsec_…</code>) and add it as{' '}
                  <code className="font-mono text-white">STRIPE_WEBHOOK_SECRET</code> in your Railway environment variables.
                </span>
              </li>
            </ol>
          </div>
        </div>
      ) : incompleteSetup ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-yellow-400" />
            <span className="text-sm text-yellow-300 font-medium">Setup incomplete</span>
          </div>
          <p className="text-xs text-gray-400">Complete Stripe onboarding to start accepting payments.</p>
          <button
            onClick={connectStripe}
            disabled={connecting}
            className="text-sm bg-accent hover:bg-accent/90 disabled:opacity-50 text-navy font-bold px-4 py-2 rounded-lg transition-colors"
          >
            {connecting ? 'Redirecting…' : 'Resume Setup →'}
          </button>
        </div>
      ) : (
        <button
          onClick={connectStripe}
          disabled={connecting}
          className="text-sm bg-accent hover:bg-accent/90 disabled:opacity-50 text-navy font-bold px-4 py-2 rounded-lg transition-colors"
        >
          {connecting ? 'Redirecting…' : 'Connect Stripe →'}
        </button>
      )}
    </div>
  );
}

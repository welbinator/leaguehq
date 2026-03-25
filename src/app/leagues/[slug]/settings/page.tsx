'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/Card';

interface League {
  id: string;
  name: string;
  ownerId: string;
  teamChatsEnabled: boolean;
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
      if (leagueJson.data) setLeague(leagueJson.data);
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

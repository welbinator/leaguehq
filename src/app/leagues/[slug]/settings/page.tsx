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
    </div>
  );
}

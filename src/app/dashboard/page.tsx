'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { LeagueCard } from '@/components/league/LeagueCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import type { League } from '@/types';

const SPORTS = [
  'Soccer', 'Basketball', 'Baseball', 'Football', 'Volleyball',
  'Tennis', 'Hockey', 'Softball', 'Lacrosse', 'Rugby', 'Other',
];

export const dynamic = 'force-dynamic';

export default function DashboardPage() {
  const sessionResult = useSession();
  const session = sessionResult?.data;
  const status = sessionResult?.status;
  const router = useRouter();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [hasActivePlan, setHasActivePlan] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueSport, setNewLeagueSport] = useState('Soccer');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchLeagues() {
    try {
      const res = await fetch('/api/leagues');
      if (!res.ok) throw new Error('Failed to fetch leagues');
      const json = await res.json();
      setLeagues(json.data ?? []);
    } catch (err) {
      console.error(err);
      setError('Failed to load leagues');
    } finally {
      setLoading(false);
    }
  }

  async function fetchSubscriptionStatus() {
    try {
      const res = await fetch('/api/user/subscription');
      if (res.ok) {
        const json = await res.json();
        setHasActivePlan(json.hasActivePlan ?? false);
      }
    } catch (err) {
      console.error('Failed to fetch subscription status', err);
    }
  }

  // Redirect players/captains to their own dashboard
  useEffect(() => {
    if (status === 'loading') return;
    const role = (session?.user as any)?.role;
    if (role === 'PLAYER' || role === 'CAPTAIN' || role === 'COACH' || role === 'REFEREE') {
      router.replace('/dashboard/player');
    }
  }, [session, status, router]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    if (params.get('subscribed') === '1') {
      // Returning from Stripe checkout — activate first, then fetch status
      const tier = params.get('tier') ?? 'STARTER';
      fetch('/api/stripe/activate-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier }),
      })
        .then(r => r.json())
        .then(json => {
          if (json.ok) {
            setHasActivePlan(true);
          }
          // Clean up URL regardless
          window.history.replaceState({}, '', '/dashboard');
        })
        .catch(() => {
          window.history.replaceState({}, '', '/dashboard');
        });
    } else {
      // Normal load — check subscription status from DB
      fetchSubscriptionStatus();
    }

    fetchLeagues();
  }, []);

  async function handleCreateLeague(e: React.FormEvent) {
    e.preventDefault();
    if (!newLeagueName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newLeagueName.trim(), sport: newLeagueSport }),
      });
      if (!res.ok) {
        const json = await res.json();
        if (json.error === 'SUBSCRIPTION_REQUIRED') {
          window.location.href = '/pricing';
          return;
        }
        throw new Error(json.message ?? json.error ?? 'Failed to create league');
      }
      setCreateModalOpen(false);
      setNewLeagueName('');
      setNewLeagueSport('Soccer');
      await fetchLeagues();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  }

  const totalTeams = leagues.reduce((sum: number, l: any) => sum + (l.teamRegCount ?? 0), 0);
  const totalPlayers = leagues.reduce((sum: number, l: any) => sum + (l.playerRegCount ?? 0), 0);

  // Don't render director dashboard for players — show spinner while redirect fires
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-navy">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const role = (session?.user as any)?.role;
  if (role === 'PLAYER' || role === 'CAPTAIN' || role === 'COACH' || role === 'REFEREE') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-navy">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-navy">
      <Sidebar />

      <main className="flex-1 ml-14 md:ml-64 p-4 md:p-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">My Leagues</h1>
            <p className="text-gray-400 mt-1">
              Manage your leagues, seasons, and teams from one place.
            </p>
          </div>
          {hasActivePlan ? (
            <Button onClick={() => setCreateModalOpen(true)} size="lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              New League
            </Button>
          ) : (
            <a href="/pricing" className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
              🔒 Choose a Plan
            </a>
          )}
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Leagues', value: loading ? '—' : leagues.length, icon: '🏆' },
            { label: 'Active Teams', value: loading ? '—' : totalTeams, icon: '👥' },
            { label: 'Total Players', value: loading ? '—' : totalPlayers, icon: '🏃' },
            { label: 'This Month', value: loading ? '—' : `$${monthRevenue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`, icon: '💳' },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface border border-white/[0.06] rounded-2xl p-5">
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Leagues grid */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : leagues.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {leagues.map((league) => (
              <LeagueCard key={league.id} league={league} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-2xl font-bold text-white mb-2">No leagues yet</h3>
            <p className="text-gray-400 mb-6 max-w-md">
              Create your first league to get started. You can manage teams, schedules, and players all in one place.
            </p>
            {hasActivePlan ? (
              <Button onClick={() => setCreateModalOpen(true)} size="lg">
                Create Your First League
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-gray-500">A paid plan is required to create a league.</p>
                <a href="/pricing" className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-bold px-6 py-3 rounded-xl transition-colors">
                  View Plans →
                </a>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Create League Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New League"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="create-league-form" loading={creating}>
              Create League
            </Button>
          </>
        }
      >
        <form id="create-league-form" onSubmit={handleCreateLeague} className="space-y-4">
          <Input
            label="League Name"
            value={newLeagueName}
            onChange={(e) => setNewLeagueName(e.target.value)}
            placeholder="e.g. Cedar Rapids Adult Soccer League"
            required
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-gray-300">Sport</label>
            <select
              value={newLeagueSport}
              onChange={(e) => setNewLeagueSport(e.target.value)}
              className="w-full bg-navy border border-white/10 rounded-lg text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent hover:border-white/20 transition-all"
            >
              {SPORTS.map((s) => (
                <option key={s} value={s} className="bg-navy">{s}</option>
              ))}
            </select>
          </div>
          <p className="text-xs text-gray-500">
            You can customize divisions, seasons, pricing, and settings after creating your league.
          </p>
        </form>
      </Modal>
    </div>
  );
}

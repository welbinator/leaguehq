'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { LeagueCard } from '@/components/league/LeagueCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import type { League } from '@/types';

// Mock data for scaffold — replace with real API calls
const mockLeagues: League[] = [
  {
    id: '1',
    name: 'Cedar Rapids Adult Soccer',
    slug: 'cedar-rapids-soccer',
    ownerId: 'user1',
    sport: 'Soccer',
    description: 'Competitive adult soccer league with 3 divisions. Spring and fall seasons.',
    settings: {
      rosterManagedBy: 'COACH',
      minRosterSize: 11,
      maxRosterSize: 20,
      allowMultipleTeams: false,
      refereesInApp: true,
      pricingType: 'PER_PLAYER',
    },
    subscriptionTier: 'GROWTH',
    subscriptionStatus: 'ACTIVE',
    createdAt: new Date('2024-01-15'),
    _count: { teams: 12, members: 180 },
  },
  {
    id: '2',
    name: 'Downtown Basketball League',
    slug: 'downtown-basketball',
    ownerId: 'user1',
    sport: 'Basketball',
    description: '5-on-5 recreational basketball. All skill levels welcome.',
    settings: {
      rosterManagedBy: 'CAPTAIN',
      minRosterSize: 5,
      maxRosterSize: 12,
      allowMultipleTeams: false,
      refereesInApp: false,
      pricingType: 'PER_TEAM',
    },
    subscriptionTier: 'STARTER',
    subscriptionStatus: 'ACTIVE',
    createdAt: new Date('2024-03-01'),
    _count: { teams: 8, members: 64 },
  },
];

const SPORTS = [
  'Soccer', 'Basketball', 'Baseball', 'Football', 'Volleyball',
  'Tennis', 'Hockey', 'Softball', 'Lacrosse', 'Rugby', 'Other',
];

export default function DashboardPage() {
  const [leagues] = useState<League[]>(mockLeagues);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [newLeagueSport, setNewLeagueSport] = useState('Soccer');
  const [creating, setCreating] = useState(false);

  async function handleCreateLeague(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    // TODO: implement API call to POST /api/leagues
    setTimeout(() => {
      setCreating(false);
      setCreateModalOpen(false);
      setNewLeagueName('');
      setNewLeagueSport('Soccer');
    }, 1000);
  }

  return (
    <div className="flex min-h-screen bg-navy">
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 ml-64 p-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-white">My Leagues</h1>
            <p className="text-gray-400 mt-1">
              Manage your leagues, seasons, and teams from one place.
            </p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)} size="lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            New League
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Leagues', value: leagues.length, icon: '🏆' },
            { label: 'Active Teams', value: leagues.reduce((sum, l) => sum + (l._count?.teams ?? 0), 0), icon: '👥' },
            { label: 'Total Players', value: leagues.reduce((sum, l) => sum + (l._count?.members ?? 0), 0), icon: '🏃' },
            { label: 'This Month', value: '$0', icon: '💳' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-surface border border-white/[0.06] rounded-2xl p-5"
            >
              <div className="text-2xl mb-2">{stat.icon}</div>
              <div className="text-2xl font-black text-white">{stat.value}</div>
              <div className="text-sm text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Leagues grid */}
        {leagues.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {leagues.map((league) => (
              <LeagueCard key={league.id} league={league} />
            ))}

            {/* Create new league card */}
            <button
              onClick={() => setCreateModalOpen(true)}
              className="bg-surface border border-dashed border-white/10 rounded-2xl p-6 flex flex-col items-center justify-center gap-3 hover:border-accent/30 hover:bg-accent/5 transition-all duration-200 group min-h-[200px]"
            >
              <div className="w-12 h-12 bg-white/5 group-hover:bg-accent/10 rounded-xl flex items-center justify-center transition-colors">
                <svg className="w-6 h-6 text-gray-400 group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">
                Create New League
              </span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-2xl font-bold text-white mb-2">No leagues yet</h3>
            <p className="text-gray-400 mb-6 max-w-md">
              Create your first league to get started. You can manage teams, schedules, and players all in one place.
            </p>
            <Button onClick={() => setCreateModalOpen(true)} size="lg">
              Create Your First League
            </Button>
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
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="create-league-form"
              loading={creating}
            >
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
                <option key={s} value={s} className="bg-navy">
                  {s}
                </option>
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

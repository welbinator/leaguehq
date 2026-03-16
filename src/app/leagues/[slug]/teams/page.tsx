'use client';

import { useEffect, useState } from 'react';
import { TeamCard } from '@/components/league/TeamCard';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';

interface TeamsPageProps {
  params: { slug: string };
}

export default function TeamsPage({ params }: TeamsPageProps) {
  const { slug } = params;
  const [leagueId, setLeagueId] = useState<string | null>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [creating, setCreating] = useState(false);

  async function fetchData() {
    try {
      // Get league id from slug
      const leagueRes = await fetch(`/api/leagues/${slug}`);
      const leagueJson = await leagueRes.json();
      if (leagueJson.error) throw new Error(leagueJson.error);
      const id = leagueJson.data.id;
      setLeagueId(id);

      // Get teams for this league
      const teamsRes = await fetch(`/api/teams?leagueId=${id}`);
      const teamsJson = await teamsRes.json();
      if (teamsJson.error) throw new Error(teamsJson.error);
      setTeams(teamsJson.data ?? []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, [slug]);

  async function handleCreateTeam(e: React.FormEvent) {
    e.preventDefault();
    if (!newTeamName.trim() || !leagueId) return;
    setCreating(true);
    try {
      const res = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTeamName.trim(), leagueId }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? 'Failed to create team');
      }
      setCreateModalOpen(false);
      setNewTeamName('');
      await fetchData();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-white">Teams</h2>
            <p className="text-gray-400">
              {loading ? 'Loading…' : `${teams.length} team${teams.length !== 1 ? 's' : ''} registered`}
            </p>
          </div>
          <Button onClick={() => setCreateModalOpen(true)}>Add Team</Button>
        </div>

        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400 text-sm">{error}</div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : teams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <TeamCard key={team.id} team={{ ...team, leagueSlug: slug }} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-5xl mb-4">👥</div>
            <h3 className="text-xl font-bold text-white mb-2">No teams yet</h3>
            <p className="text-gray-400 mb-6">Add your first team to get started.</p>
            <Button onClick={() => setCreateModalOpen(true)}>Add Team</Button>
          </div>
        )}
      </div>

      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Add Team"
        footer={
          <>
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button type="submit" form="create-team-form" loading={creating}>Add Team</Button>
          </>
        }
      >
        <form id="create-team-form" onSubmit={handleCreateTeam} className="space-y-4">
          <Input
            label="Team Name"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            placeholder="e.g. Lightning FC"
            required
          />
        </form>
      </Modal>
    </div>
  );
}

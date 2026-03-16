import { TeamCard } from '@/components/league/TeamCard';
import { Button } from '@/components/ui/Button';

interface TeamsPageProps {
  params: { slug: string };
}

// Mock teams for scaffold
const mockTeams = [
  { id: '1', name: 'Lightning FC', leagueId: '1', createdAt: new Date(), _count: { members: 16 }, coach: { id: 'u1', name: 'Mike Davis', avatarUrl: null }, captain: { id: 'u2', name: 'Sarah Chen', avatarUrl: null } },
  { id: '2', name: 'Thunder United', leagueId: '1', createdAt: new Date(), _count: { members: 14 }, coach: { id: 'u3', name: 'James Wright', avatarUrl: null }, captain: null },
  { id: '3', name: 'Storm City FC', leagueId: '1', createdAt: new Date(), _count: { members: 18 }, coach: null, captain: { id: 'u4', name: 'Emma Torres', avatarUrl: null } },
];

export default function TeamsPage({ params }: TeamsPageProps) {
  return (
    <div className="min-h-screen bg-navy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-white">Teams</h2>
            <p className="text-gray-400">{mockTeams.length} teams registered this season</p>
          </div>
          <Button>Add Team</Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {mockTeams.map((team) => (
            <TeamCard key={team.id} team={{ ...team, leagueSlug: params.slug }} />
          ))}
        </div>
      </div>
    </div>
  );
}

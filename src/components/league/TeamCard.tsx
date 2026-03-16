import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import type { Team } from '@/types';

interface TeamCardProps {
  team: Team & { leagueSlug?: string };
}

export function TeamCard({ team }: TeamCardProps) {
  const memberCount = team._count?.members ?? 0;

  return (
    <div className="group bg-surface border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 transition-all duration-200">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-navy rounded-xl flex items-center justify-center border border-white/10">
          {team.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={team.logoUrl} alt={team.name} className="w-7 h-7 object-contain rounded-lg" />
          ) : (
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
          )}
        </div>
        <div>
          <h3 className="font-bold text-white">{team.name}</h3>
          <p className="text-xs text-gray-400">{memberCount} members</p>
        </div>
      </div>

      {/* Staff */}
      <div className="space-y-2 mb-4">
        {team.coach && (
          <div className="flex items-center gap-2">
            <Badge variant="info" size="sm">Coach</Badge>
            <span className="text-sm text-gray-300">{team.coach.name}</span>
          </div>
        )}
        {team.captain && (
          <div className="flex items-center gap-2">
            <Badge variant="purple" size="sm">Captain</Badge>
            <span className="text-sm text-gray-300">{team.captain.name}</span>
          </div>
        )}
      </div>

      {/* Action */}
      {team.leagueSlug && (
        <Link
          href={`/leagues/${team.leagueSlug}/teams/${team.id}`}
          className="block text-center text-sm font-medium text-accent hover:text-accent-light transition-colors py-2 border border-accent/20 rounded-lg hover:bg-accent/5"
        >
          View Roster →
        </Link>
      )}
    </div>
  );
}

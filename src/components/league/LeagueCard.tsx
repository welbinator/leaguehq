import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import type { League, SubscriptionStatus } from '@/types';

interface LeagueCardProps {
  league: League & {
    _count?: { teams?: number; registrations?: number };
  };
}

const statusVariant: Record<SubscriptionStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  ACTIVE: 'success',
  TRIALING: 'info' as any,
  PAST_DUE: 'warning',
  CANCELLED: 'danger',
  UNPAID: 'danger',
};

const sportIcons: Record<string, string> = {
  Soccer: '⚽',
  Basketball: '🏀',
  Baseball: '⚾',
  Football: '🏈',
  Volleyball: '🏐',
  Tennis: '🎾',
  Hockey: '🏒',
  Softball: '🥎',
  default: '🏆',
};

export function LeagueCard({ league }: LeagueCardProps) {
  const icon = sportIcons[league.sport] ?? sportIcons.default;
  const teams = league._count?.teams ?? 0;
  const players = league._count?.registrations ?? 0;

  return (
    <Link href={`/leagues/${league.slug}`}>
      <div className="group bg-surface border border-white/[0.06] rounded-2xl p-6 hover:border-white/10 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/30 transition-all duration-200 cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-navy rounded-xl flex items-center justify-center text-2xl border border-white/10">
              {league.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={league.logoUrl} alt={league.name} className="w-8 h-8 object-contain rounded-lg" />
              ) : (
                icon
              )}
            </div>
            <div>
              <h3 className="font-bold text-white text-lg leading-tight group-hover:text-accent transition-colors">
                {league.name}
              </h3>
              <p className="text-sm text-gray-400">{league.sport}</p>
            </div>
          </div>
          <Badge variant={statusVariant[league.subscriptionStatus] ?? 'default'} dot>
            {league.subscriptionTier}
          </Badge>
        </div>

        {/* Description */}
        {league.description && (
          <p className="text-sm text-gray-400 mb-4 line-clamp-2">{league.description}</p>
        )}

        {/* Stats */}
        <div className="flex items-center gap-4 pt-4 border-t border-white/[0.06]">
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>{teams} teams</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>{players} players</span>
          </div>
          <div className="ml-auto">
            <svg className="w-5 h-5 text-gray-600 group-hover:text-accent transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </Link>
  );
}

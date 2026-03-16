'use client';

import { Badge } from '@/components/ui/Badge';
import { LeagueNav } from '@/components/league/LeagueNav';
import { Card } from '@/components/ui/Card';
import type { GameStatus } from '@/types';

interface SchedulePageProps {
  params: { slug: string };
}

const statusVariant: Record<GameStatus, 'default' | 'success' | 'warning' | 'danger'> = {
  SCHEDULED: 'default',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  POSTPONED: 'warning',
};

const mockGames = [
  { id: '1', date: 'Apr 5', time: '7:00 PM', home: 'Lightning FC', away: 'Thunder United', location: 'Noelridge Park - Field 1', status: 'SCHEDULED' as GameStatus },
  { id: '2', date: 'Apr 5', time: '8:00 PM', home: 'Storm City FC', away: 'Rapids FC', location: 'Noelridge Park - Field 2', status: 'SCHEDULED' as GameStatus },
  { id: '3', date: 'Apr 3', time: '7:00 PM', home: 'Dynamo SC', away: 'Lightning FC', location: 'Squaw Creek Park', status: 'COMPLETED' as GameStatus, score: '2 - 1' },
  { id: '4', date: 'Apr 3', time: '8:00 PM', home: 'Thunder United', away: 'Storm City FC', location: 'Squaw Creek Park', status: 'COMPLETED' as GameStatus, score: '0 - 3' },
];

export default function SchedulePage({ params }: SchedulePageProps) {
  return (
    <div className="min-h-screen bg-navy">
      <LeagueNav slug={params.slug} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black text-white">Schedule</h2>
            <p className="text-gray-400">Spring 2025 season</p>
          </div>
        </div>

        <Card>
          <div className="space-y-1">
            {mockGames.map((game, i) => (
              <div
                key={game.id}
                className={`flex items-center gap-4 py-4 ${i < mockGames.length - 1 ? 'border-b border-white/[0.06]' : ''}`}
              >
                <div className="text-center min-w-[60px]">
                  <div className="text-xs text-gray-500 uppercase tracking-wide">{game.date.split(' ')[0]}</div>
                  <div className="text-xl font-black text-white">{game.date.split(' ')[1]}</div>
                  <div className="text-xs text-gray-400">{game.time}</div>
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 font-medium text-white">
                    <span>{game.home}</span>
                    {game.score ? (
                      <span className="text-accent font-black text-lg">{game.score}</span>
                    ) : (
                      <span className="text-gray-500 text-sm">vs</span>
                    )}
                    <span>{game.away}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-0.5">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {game.location}
                  </div>
                </div>

                <Badge variant={statusVariant[game.status]}>
                  {game.status.charAt(0) + game.status.slice(1).toLowerCase()}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

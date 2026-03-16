import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';

interface LeaguePageProps {
  params: { slug: string };
}

// Scaffold page — replace with real data fetching
export default function LeaguePage({ params }: LeaguePageProps) {
  const { slug } = params;

  const tabs = [
    { label: 'Overview', href: `/leagues/${slug}` },
    { label: 'Teams', href: `/leagues/${slug}/teams` },
    { label: 'Schedule', href: `/leagues/${slug}/schedule` },
    { label: 'Standings', href: `/leagues/${slug}/standings` },
    { label: 'Settings', href: `/leagues/${slug}/settings` },
  ];

  return (
    <div className="min-h-screen bg-navy">
      {/* League header */}
      <div className="bg-surface border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-start gap-6">
            <div className="w-16 h-16 bg-navy rounded-2xl flex items-center justify-center text-3xl border border-white/10 flex-shrink-0">
              ⚽
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-3xl font-black text-white">League Name</h1>
                <Badge variant="success" dot>Active</Badge>
              </div>
              <p className="text-gray-400">Soccer · 12 teams · 180 players</p>
            </div>
          </div>

          {/* Tab nav */}
          <nav className="flex gap-1 mt-6 overflow-x-auto">
            {tabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="px-4 py-2 text-sm font-medium text-gray-400 hover:text-white rounded-lg hover:bg-white/5 transition-all whitespace-nowrap"
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <h2 className="text-xl font-bold text-white mb-4">Current Season</h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center py-3 border-b border-white/[0.06]">
                  <span className="text-gray-400">Season</span>
                  <span className="text-white font-medium">Spring 2025</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/[0.06]">
                  <span className="text-gray-400">Status</span>
                  <Badge variant="success" dot>Registration Open</Badge>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-white/[0.06]">
                  <span className="text-gray-400">Start Date</span>
                  <span className="text-white font-medium">April 1, 2025</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-400">Registration Fee</span>
                  <span className="text-accent font-bold">$75/player</span>
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-bold text-white mb-4">Upcoming Games</h2>
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4 py-3 border-b border-white/[0.06] last:border-0">
                    <div className="text-center min-w-[50px]">
                      <div className="text-xs text-gray-400">APR</div>
                      <div className="text-xl font-black text-white">{i * 5}</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 text-sm font-medium text-white">
                        Team A <span className="text-gray-500">vs</span> Team B
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">7:00 PM · Noelridge Park</div>
                    </div>
                    <Badge variant="default">Scheduled</Badge>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <h3 className="text-lg font-bold text-white mb-4">Quick Stats</h3>
              <div className="space-y-3">
                {[
                  { label: 'Teams', value: '12' },
                  { label: 'Registered Players', value: '147' },
                  { label: 'Games Played', value: '48' },
                  { label: 'Games Remaining', value: '32' },
                ].map((stat) => (
                  <div key={stat.label} className="flex justify-between">
                    <span className="text-sm text-gray-400">{stat.label}</span>
                    <span className="text-sm font-bold text-white">{stat.value}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="text-lg font-bold text-white mb-4">Divisions</h3>
              <div className="space-y-2">
                {['Division A (Competitive)', 'Division B (Intermediate)', 'Division C (Recreational)'].map(
                  (div) => (
                    <div key={div} className="flex items-center gap-2 py-2 border-b border-white/[0.06] last:border-0">
                      <div className="w-2 h-2 rounded-full bg-accent" />
                      <span className="text-sm text-gray-300">{div}</span>
                    </div>
                  )
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

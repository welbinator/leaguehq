import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

interface StandingsPageProps {
  params: { slug: string };
}

const mockStandings = [
  { rank: 1, team: 'Lightning FC', w: 8, l: 1, d: 1, gf: 24, ga: 9, pts: 25 },
  { rank: 2, team: 'Storm City FC', w: 7, l: 2, d: 1, gf: 21, ga: 12, pts: 22 },
  { rank: 3, team: 'Thunder United', w: 6, l: 3, d: 1, gf: 18, ga: 14, pts: 19 },
  { rank: 4, team: 'Rapids FC', w: 5, l: 4, d: 1, gf: 16, ga: 15, pts: 16 },
  { rank: 5, team: 'Dynamo SC', w: 4, l: 5, d: 1, gf: 14, ga: 18, pts: 13 },
  { rank: 6, team: 'United Stars', w: 3, l: 6, d: 1, gf: 12, ga: 20, pts: 10 },
];

export default function StandingsPage({ params }: StandingsPageProps) {
  return (
    <div className="min-h-screen bg-navy">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white">Standings</h2>
          <p className="text-gray-400">Spring 2025 · Division A</p>
        </div>

        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['#', 'Team', 'W', 'L', 'D', 'GF', 'GA', 'GD', 'Pts'].map((col) => (
                    <th
                      key={col}
                      className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide"
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mockStandings.map((row, i) => (
                  <tr
                    key={row.team}
                    className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${i < 3 ? 'border-l-2 border-l-accent' : ''}`}
                  >
                    <td className="px-4 py-3 text-sm text-gray-400">{row.rank}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-navy rounded-md border border-white/10 flex items-center justify-center text-xs">
                          ⚽
                        </div>
                        <span className="text-sm font-semibold text-white">{row.team}</span>
                        {i < 3 && (
                          <Badge variant="success" size="sm">
                            Playoffs
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-white">{row.w}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{row.l}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{row.d}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{row.gf}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{row.ga}</td>
                    <td className="px-4 py-3 text-sm text-gray-400">{row.gf - row.ga > 0 ? `+${row.gf - row.ga}` : row.gf - row.ga}</td>
                    <td className="px-4 py-3 text-sm font-black text-accent">{row.pts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <p className="text-xs text-gray-500 mt-4">
          Top 3 teams advance to playoffs. GD = Goal Difference. Pts = Points (Win=3, Draw=1, Loss=0).
        </p>
      </div>
    </div>
  );
}

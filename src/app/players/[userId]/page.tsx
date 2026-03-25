'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';

export default function PlayerProfilePage({ params }: { params: { userId: string } }) {
  const { userId } = params;
  const router = useRouter();
  const [player, setPlayer] = useState<any>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch(`/api/players/${userId}`).then(r => r.json()),
      fetch('/api/account').then(r => r.json()),
    ]).then(([playerJson, accountJson]) => {
      if (playerJson.data) setPlayer(playerJson.data);
      if (accountJson.data?.id) setMyId(accountJson.data.id);
    }).finally(() => setLoading(false));
  }, [userId]);

  const displayName = player?.firstName
    ? `${player.firstName}${player.lastName ? ' ' + player.lastName : ''}`
    : player?.name ?? 'Player';
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-navy">
      <Sidebar />
      <main className="flex-1 ml-14 md:ml-64 p-4 md:p-8">
        <div className="max-w-2xl mx-auto">
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-400 hover:text-white mb-6 flex items-center gap-1 transition-colors"
          >
            ← Back
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !player ? (
            <div className="text-center py-24 text-gray-400">Player not found.</div>
          ) : (
            <div className="space-y-4">
              {/* Header card */}
              <Card>
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-accent/20 border border-accent/20 flex items-center justify-center text-2xl font-black text-accent flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h1 className="text-2xl font-black text-white">{displayName}</h1>
                    {player.teamMembers?.length > 0 && (
                      <p className="text-gray-400 text-sm mt-0.5">
                        {player.teamMembers.map((tm: any) => tm.team?.name).filter(Boolean).join(', ')}
                      </p>
                    )}
                  </div>
                  {myId && myId !== userId && (
                    <button
                      onClick={() => router.push(`/dashboard/messages?with=${userId}`)}
                      className="bg-accent hover:bg-accent/90 text-navy font-bold px-4 py-2 rounded-xl text-sm transition-colors flex-shrink-0"
                    >
                      Message
                    </button>
                  )}
                </div>
              </Card>

              {/* Teams */}
              {player.teamMembers?.length > 0 && (
                <Card>
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Teams</h2>
                  <div className="space-y-2">
                    {player.teamMembers.map((tm: any) => (
                      <div key={tm.id} className="flex items-center justify-between">
                        <span className="text-white text-sm font-medium">{tm.team?.name}</span>
                        <Badge variant="default">{tm.role?.toLowerCase()}</Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Seasons */}
              {player.playerRegistrations?.length > 0 && (
                <Card>
                  <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Seasons</h2>
                  <div className="space-y-2">
                    {player.playerRegistrations.map((reg: any) => (
                      <div key={reg.id} className="flex items-center justify-between">
                        <div>
                          <p className="text-white text-sm font-medium">{reg.season?.name}</p>
                          <p className="text-xs text-gray-500">{reg.season?.league?.name}</p>
                        </div>
                        {reg.isCaptain && <Badge variant="warning">Captain</Badge>}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

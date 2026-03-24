'use client';

import { useEffect, useState } from 'react';
import { ChatRoom } from '@/components/chat/ChatRoom';

interface Room {
  id: string;
  name: string;
  type: string;
}

export default function LeagueChatPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [userId, setUserId] = useState<string | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);

  // Get userId from account API (avoids useSession destructure issues)
  useEffect(() => {
    fetch('/api/account')
      .then(r => r.json())
      .then(json => { if (json.data?.id) setUserId(json.data.id); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!userId) return;
    fetch(`/api/chat/rooms?slug=${slug}`)
      .then(r => r.json())
      .then(json => {
        if (json.data?.length) {
          setRooms(json.data);
          setActiveRoom(json.data[0]);
        }
      })
      .finally(() => setLoading(false));
  }, [slug, userId]);

  return (
    <>
      <div className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-5xl mb-4">💬</div>
            <h2 className="text-xl font-bold text-white mb-2">No chats yet</h2>
            <p className="text-gray-400 text-sm">Chat rooms will appear here once you're added to a team or season.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {/* Room selector dropdown */}
            <div className="relative">
              <select
                value={activeRoom?.id ?? ''}
                onChange={e => setActiveRoom(rooms.find(r => r.id === e.target.value) ?? null)}
                className="w-full bg-surface border border-white/[0.08] text-white text-sm font-medium rounded-xl px-4 py-2.5 pr-10 appearance-none focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer"
              >
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>
                    {room.type === 'SEASON' ? '🏆' : '👥'} {room.name} — {room.type === 'SEASON' ? 'Season Chat' : 'Team Chat'}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs">▼</span>
            </div>

            {/* Chat area */}
            <div className="bg-surface border border-white/[0.08] rounded-2xl overflow-hidden" style={{ height: '560px' }}>
              {activeRoom && userId ? (
                <ChatRoom
                  roomId={activeRoom.id}
                  currentUserId={userId}
                  roomName={activeRoom.name}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">Select a room</div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ height: '600px' }}>
            {/* Room list */}
            <div className="bg-surface border border-white/[0.06] rounded-2xl p-3 flex flex-col gap-2 overflow-y-auto">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-1 mb-1">Rooms</p>
              {rooms.map(room => (
                <button
                  key={room.id}
                  onClick={() => setActiveRoom(room)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all text-sm font-medium ${
                    activeRoom?.id === room.id
                      ? 'bg-accent/10 border border-accent/30 text-white'
                      : 'text-gray-400 hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <span className="mr-2">{room.type === 'SEASON' ? '🏆' : '👥'}</span>
                  {room.name}
                </button>
              ))}
            </div>

            {/* Chat area */}
            <div className="md:col-span-2 h-full">
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

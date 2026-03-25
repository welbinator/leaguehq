'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { ChatRoom } from '@/components/chat/ChatRoom';

interface Room {
  id: string;
  name: string;
  type: string;
  teamId: string | null;
  seasonId: string | null;
  team: { id: string; name: string } | null;
  season: { id: string; name: string } | null;
  isMember: boolean;
  memberCount: number;
}

export default function LeagueChatPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const [userId, setUserId] = useState<string | null>(null);
  const [isDirector, setIsDirector] = useState(false);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [leaving, setLeaving] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/account')
      .then(r => r.json())
      .then(json => {
        if (json.data?.id) setUserId(json.data.id);
      });
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Try director view first
    fetch(`/api/chat/league-rooms?slug=${slug}`)
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setIsDirector(true);
          setRooms(json.data);
          // Auto-select first season room the director is a member of, or just first room
          const firstMember = json.data.find((r: Room) => r.isMember) ?? json.data[0] ?? null;
          setActiveRoom(firstMember);
        }
      })
      .catch(() => {
        // Fallback to regular member rooms
        fetch(`/api/chat/rooms?slug=${slug}`)
          .then(r => r.json())
          .then(json => {
            if (json.data?.length) {
              setRooms(json.data.map((r: any) => ({ ...r, isMember: true, memberCount: 0 })));
              setActiveRoom(json.data[0]);
            }
          });
      })
      .finally(() => setLoading(false));
  }, [slug, userId]);

  async function joinRoom(room: Room) {
    setJoining(room.id);
    try {
      await fetch(`/api/chat/rooms/${room.id}/join`, { method: 'POST' });
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, isMember: true, memberCount: r.memberCount + 1 } : r));
      setActiveRoom({ ...room, isMember: true });
    } finally {
      setJoining(null);
    }
  }

  async function leaveRoom(room: Room) {
    setLeaving(room.id);
    try {
      await fetch(`/api/chat/rooms/${room.id}/leave`, { method: 'POST' });
      setRooms(prev => prev.map(r => r.id === room.id ? { ...r, isMember: false, memberCount: Math.max(0, r.memberCount - 1) } : r));
      // If we left the active room, switch to another one we're a member of
      if (activeRoom?.id === room.id) {
        const next = rooms.find(r => r.id !== room.id && r.isMember) ?? null;
        setActiveRoom(next);
      }
    } finally {
      setLeaving(null);
    }
  }

  const seasonRooms = rooms.filter(r => r.type === 'SEASON');
  const teamRooms = rooms.filter(r => r.type === 'TEAM');
  const otherRooms = rooms.filter(r => r.type !== 'SEASON' && r.type !== 'TEAM');

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-24">
          <div className="text-5xl mb-4">💬</div>
          <h2 className="text-xl font-bold text-white mb-2">No chats yet</h2>
          <p className="text-gray-400 text-sm">Chat rooms will appear here once teams and seasons are created.</p>
        </div>
      ) : (
        <div className="flex gap-4" style={{ height: '620px' }}>

          {/* Sidebar */}
          <div className="w-64 flex-shrink-0 flex flex-col gap-2 overflow-y-auto pr-1">

            {/* Season rooms */}
            {seasonRooms.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider px-2 mb-2">Season Chats</p>
                <div className="space-y-1">
                  {seasonRooms.map(room => (
                    <RoomRow
                      key={room.id}
                      room={room}
                      isActive={activeRoom?.id === room.id}
                      isDirector={isDirector}
                      joining={joining}
                      leaving={leaving}
                      onSelect={() => room.isMember && setActiveRoom(room)}
                      onJoin={() => joinRoom(room)}
                      onLeave={() => leaveRoom(room)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Team rooms */}
            {teamRooms.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider px-2 mb-2 mt-3">Team Chats</p>
                <div className="space-y-1">
                  {teamRooms.map(room => (
                    <RoomRow
                      key={room.id}
                      room={room}
                      isActive={activeRoom?.id === room.id}
                      isDirector={isDirector}
                      joining={joining}
                      leaving={leaving}
                      onSelect={() => room.isMember && setActiveRoom(room)}
                      onJoin={() => joinRoom(room)}
                      onLeave={() => leaveRoom(room)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other rooms */}
            {otherRooms.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider px-2 mb-2 mt-3">Other</p>
                <div className="space-y-1">
                  {otherRooms.map(room => (
                    <RoomRow
                      key={room.id}
                      room={room}
                      isActive={activeRoom?.id === room.id}
                      isDirector={isDirector}
                      joining={joining}
                      leaving={leaving}
                      onSelect={() => room.isMember && setActiveRoom(room)}
                      onJoin={() => joinRoom(room)}
                      onLeave={() => leaveRoom(room)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Chat area */}
          <div className="flex-1 bg-surface border border-white/[0.08] rounded-2xl overflow-hidden">
            {activeRoom && userId && activeRoom.isMember ? (
              <ChatRoom
                roomId={activeRoom.id}
                currentUserId={userId}
                roomName={activeRoom.name}
              />
            ) : activeRoom && !activeRoom.isMember ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
                <span className="text-4xl">👥</span>
                <p className="text-white font-semibold">{activeRoom.name}</p>
                <p className="text-gray-400 text-sm">You're not in this chat yet.</p>
                {isDirector && (
                  <button
                    onClick={() => joinRoom(activeRoom)}
                    disabled={joining === activeRoom.id}
                    className="bg-accent hover:bg-accent/90 disabled:opacity-50 text-navy font-bold px-5 py-2 rounded-lg text-sm transition-colors"
                  >
                    {joining === activeRoom.id ? 'Joining…' : 'Join Chat'}
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                Select a room to start chatting
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function RoomRow({
  room, isActive, isDirector, joining, leaving, onSelect, onJoin, onLeave,
}: {
  room: Room;
  isActive: boolean;
  isDirector: boolean;
  joining: string | null;
  leaving: string | null;
  onSelect: () => void;
  onJoin: () => void;
  onLeave: () => void;
}) {
  const isJoining = joining === room.id;
  const isLeaving = leaving === room.id;

  return (
    <div
      className={`group flex flex-col px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
        isActive
          ? 'bg-accent/10 border-accent/20 text-accent'
          : room.isMember
          ? 'hover:bg-white/5 border-transparent text-gray-300 hover:text-white'
          : 'border-transparent text-gray-500 cursor-default'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm flex-shrink-0">
            {room.type === 'SEASON' ? '🏆' : '👥'}
          </span>
          <span className="text-sm font-medium truncate">{room.name}</span>
        </div>

        {/* Join/Leave buttons — only for team rooms when director */}
        {isDirector && room.type === 'TEAM' && (
          room.isMember ? (
            <button
              onClick={e => { e.stopPropagation(); onLeave(); }}
              disabled={isLeaving}
              className="flex-shrink-0 text-xs text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-2 py-0.5 rounded-md transition-all disabled:opacity-50 opacity-0 group-hover:opacity-100"
            >
              {isLeaving ? '…' : 'Leave'}
            </button>
          ) : (
            <button
              onClick={e => { e.stopPropagation(); onJoin(); }}
              disabled={isJoining}
              className="flex-shrink-0 text-xs text-accent hover:text-accent/80 border border-accent/20 hover:border-accent/40 px-2 py-0.5 rounded-md transition-all disabled:opacity-50"
            >
              {isJoining ? '…' : 'Join'}
            </button>
          )
        )}
      </div>

      {/* Member count */}
      <span className="text-xs text-gray-600 ml-7 mt-0.5">{room.memberCount} member{room.memberCount !== 1 ? 's' : ''}</span>
    </div>
  );
}

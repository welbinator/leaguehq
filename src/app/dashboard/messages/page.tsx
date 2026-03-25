'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { ChatRoom } from '@/components/chat/ChatRoom';

interface DM {
  roomId: string;
  otherUserId: string;
  otherName: string;
  lastMessage: string | null;
  lastMessageAt: string | null;
}

export default function MessagesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const withUserId = searchParams.get('with');

  const [myId, setMyId] = useState<string | null>(null);
  const [dms, setDms] = useState<DM[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [activeRoomName, setActiveRoomName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Get current user
  useEffect(() => {
    fetch('/api/account')
      .then(r => r.json())
      .then(j => { if (j.data?.id) setMyId(j.data.id); })
      .catch(() => {});
  }, []);

  const loadDMs = useCallback(async () => {
    const res = await fetch('/api/chat/dm');
    const j = await res.json();
    return j.data ?? [];
  }, []);

  // If ?with= param, open or create DM with that user first
  useEffect(() => {
    if (!myId) return;

    async function init() {
      setLoading(true);
      try {
        // If opening a specific DM
        if (withUserId) {
          const res = await fetch('/api/chat/dm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ otherUserId: withUserId }),
          });
          const j = await res.json();
          if (j.data?.roomId) {
            setActiveRoomId(j.data.roomId);
            // Remove ?with param from URL cleanly
            router.replace('/dashboard/messages');
          }
        }
        // Load all DMs
        const list = await loadDMs();
        setDms(list);
        // If no active room yet, default to first DM
        if (!withUserId && list.length > 0) {
          setActiveRoomId(list[0].roomId);
          setActiveRoomName(list[0].otherName);
        }
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [myId, withUserId, loadDMs, router]);

  // Sync room name when activeRoomId changes
  useEffect(() => {
    const dm = dms.find(d => d.roomId === activeRoomId);
    if (dm) setActiveRoomName(dm.otherName);
  }, [activeRoomId, dms]);

  return (
    <div className="flex min-h-screen bg-navy">
      <Sidebar />
      <main className="flex-1 ml-14 md:ml-64 p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-black text-white mb-5">Messages</h1>

          {loading ? (
            <div className="flex items-center justify-center py-24">
              <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          ) : dms.length === 0 && !activeRoomId ? (
            <div className="text-center py-24">
              <div className="text-5xl mb-4">💬</div>
              <h2 className="text-xl font-bold text-white mb-2">No messages yet</h2>
              <p className="text-gray-400 text-sm">Visit a teammate's profile to start a conversation.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ minHeight: '560px' }}>
              {/* DM list */}
              <div className="bg-surface border border-white/[0.06] rounded-2xl p-3 flex flex-col gap-1 overflow-y-auto">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest px-2 mb-2">Conversations</p>
                {dms.length === 0 ? (
                  <p className="text-xs text-gray-600 px-2">No conversations yet</p>
                ) : dms.map(dm => (
                  <button
                    key={dm.roomId}
                    onClick={() => { setActiveRoomId(dm.roomId); setActiveRoomName(dm.otherName); }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl transition-all ${
                      activeRoomId === dm.roomId
                        ? 'bg-accent/10 border border-accent/30'
                        : 'border border-transparent hover:bg-white/[0.04]'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-accent text-xs font-bold">
                          {dm.otherName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{dm.otherName}</p>
                        {dm.lastMessage && (
                          <p className="text-gray-500 text-xs truncate">{dm.lastMessage}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Chat area */}
              <div className="md:col-span-2 bg-surface border border-white/[0.06] rounded-2xl overflow-hidden" style={{ minHeight: '480px' }}>
                {activeRoomId && myId ? (
                  <ChatRoom roomId={activeRoomId} currentUserId={myId} roomName={activeRoomName} />
                ) : (
                  <div className="flex items-center justify-center h-full py-24 text-gray-500 text-sm">
                    Select a conversation
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

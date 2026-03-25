'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  content: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    firstName?: string | null;
    lastName?: string | null;
    avatarUrl?: string | null;
  };
}

interface ChatRoomProps {
  roomId: string;
  currentUserId: string;
  roomName: string;
}

let socket: Socket | null = null;

export function ChatRoom({ roomId, currentUserId, roomName }: ChatRoomProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/chat/rooms/${roomId}/messages`)
      .then(r => r.json())
      .then(j => setMessages(j.data ?? []));

    if (!socket) {
      socket = io({ path: '/socket.io' });
    }
    socket.emit('join-room', roomId);
    setConnected(socket.connected);

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onMessage = (msg: Message) => {
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('new-message', onMessage);

    // Reconnect and re-fetch when tab becomes visible again after being idle
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') {
        if (socket && !socket.connected) {
          socket.connect();
        }
        socket?.emit('join-room', roomId);
        // Re-fetch missed messages
        fetch(`/api/chat/rooms/${roomId}/messages`)
          .then(r => r.json())
          .then(j => setMessages(j.data ?? []));
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      socket?.emit('leave-room', roomId);
      socket?.off('connect', onConnect);
      socket?.off('disconnect', onDisconnect);
      socket?.off('new-message', onMessage);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput('');
    setSending(true);

    // Reconnect socket if it dropped while idle
    if (socket && !socket.connected) {
      socket.connect();
      socket.emit('join-room', roomId);
    }

    try {
      const res = await fetch(`/api/chat/rooms/${roomId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text }),
      });
      const json = await res.json();
      // Optimistically add own message if socket didn't already deliver it
      if (json.data) {
        setMessages(prev => prev.some(m => m.id === json.data.id) ? prev : [...prev, json.data]);
      }
    } finally {
      setSending(false);
    }
  }

  function displayName(user: Message['user']) {
    if (user.firstName) return `${user.firstName} ${user.lastName ?? ''}`.trim();
    return user.name;
  }

  return (
    <div className="flex flex-col h-full min-h-[400px] max-h-[600px]">
      <div className="px-4 py-3 border-b border-white/[0.08] flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">{roomName}</h3>
        <span
          className={`w-2 h-2 rounded-full ${connected ? 'bg-accent' : 'bg-gray-600'}`}
          title={connected ? 'Connected' : 'Connecting…'}
        />
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-gray-600 text-sm py-8">No messages yet. Say hi! 👋</p>
        )}
        {messages.map(msg => {
          const isMe = msg.user.id === currentUserId;
          return (
            <div key={msg.id} className={`flex gap-2 ${isMe ? 'flex-row-reverse' : ''}`}>
              <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center text-xs font-bold text-accent flex-shrink-0">
                {displayName(msg.user).charAt(0).toUpperCase()}
              </div>
              <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMe ? 'items-end' : 'items-start'}`}>
                {!isMe && (
                  <Link href={`/players/${msg.user.id}`} className="text-xs text-gray-500 hover:text-accent px-1 transition-colors">
                    {displayName(msg.user)}
                  </Link>
                )}
                <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? 'bg-accent text-navy font-medium rounded-tr-sm'
                    : 'bg-white/[0.06] text-white rounded-tl-sm'
                }`}>
                  {msg.content}
                </div>
                <span className="text-xs text-gray-600 px-1">
                  {new Date(msg.createdAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                </span>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="px-4 py-3 border-t border-white/[0.08] flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message…"
          className="flex-1 bg-navy border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-accent/50"
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="bg-accent text-navy font-bold px-4 py-2 rounded-xl text-sm disabled:opacity-40 hover:bg-accent/90 transition-colors flex-shrink-0"
        >
          Send
        </button>
      </form>
    </div>
  );
}

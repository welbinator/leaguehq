'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';

type Tab = 'profile' | 'team' | 'schedule' | 'chat';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'profile',  label: 'Profile',  icon: '👤' },
  { id: 'team',     label: 'My Team',  icon: '🏅' },
  { id: 'schedule', label: 'Schedule', icon: '📅' },
  { id: 'chat',     label: 'Chat',     icon: '💬' },
];

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

const DUMMY_GAMES = [
  { id: 1, date: 'Tue, Apr 8',  time: '7:00 PM',  opponent: 'Thunder Hawks',  location: 'Field 3 — Riverside Park',  result: null },
  { id: 2, date: 'Tue, Apr 15', time: '7:00 PM',  opponent: 'Iron Wolves',    location: 'Field 1 — Riverside Park',  result: null },
  { id: 3, date: 'Sat, Apr 19', time: '10:00 AM', opponent: 'Blue Lightning', location: 'Field 2 — Elmwood Complex', result: null },
  { id: 4, date: 'Tue, Mar 25', time: '7:00 PM',  opponent: 'Red Devils',     location: 'Field 3 — Riverside Park',  result: 'W 3–1' },
  { id: 5, date: 'Tue, Mar 18', time: '8:30 PM',  opponent: 'Storm United',   location: 'Field 1 — Riverside Park',  result: 'L 0–2' },
  { id: 6, date: 'Sat, Mar 8',  time: '11:00 AM', opponent: 'Falcon City FC', location: 'Field 4 — Elmwood Complex', result: 'W 2–2 (PKs)' },
];

const DUMMY_ROOMS = [
  {
    id: 1, name: 'Team Chat', icon: '🏅',
    lastMessage: "Coach: Don't forget practice Thursday at 6pm!",
    time: '2h ago', unread: 3,
    messages: [
      { from: 'Coach Martinez', text: 'Great game last Tuesday everyone!',       time: 'Mar 25, 8:45 PM', self: false },
      { from: 'You',            text: 'Thanks coach, that last goal was clutch 😄', time: 'Mar 25, 9:01 PM', self: true  },
      { from: 'Tyler R.',       text: 'See everyone at practice Thursday?',       time: 'Mar 26, 10:12 AM', self: false },
      { from: 'Coach Martinez', text: "Don't forget practice Thursday at 6pm!",  time: 'Today, 9:30 AM',  self: false },
    ],
  },
  {
    id: 2, name: 'Spring Season — All Players', icon: '🏆',
    lastMessage: 'League: Week 4 schedule is now posted.',
    time: '1d ago', unread: 1,
    messages: [
      { from: 'League Admin', text: 'Welcome to the Spring 2026 Season! Good luck to all teams.', time: 'Mar 1, 9:00 AM',   self: false },
      { from: 'League Admin', text: 'Week 4 schedule is now posted.',                              time: 'Mar 25, 12:00 PM', self: false },
    ],
  },
  {
    id: 3, name: 'Division A', icon: '⚽',
    lastMessage: 'Alex: Anyone know if Field 3 has lights?',
    time: '3d ago', unread: 0,
    messages: [
      { from: 'Alex K.', text: 'Anyone know if Field 3 has lights?', time: 'Mar 22, 6:15 PM', self: false },
    ],
  },
];

export default function PlayerDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', address: '', city: '', state: '', zip: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [activeRoom, setActiveRoom] = useState(DUMMY_ROOMS[0]);
  const [chatInput, setChatInput] = useState('');

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    if (status === 'unauthenticated') { router.push('/login'); return; }
    fetch('/api/account')
      .then(r => r.json())
      .then(json => {
        if (json.data) {
          setUser(json.data);
          setForm({
            firstName: json.data.firstName || '',
            lastName:  json.data.lastName  || '',
            phone:     json.data.phone     || '',
            address:   json.data.address   || '',
            city:      json.data.city      || '',
            state:     json.data.state     || '',
            zip:       json.data.zip       || '',
          });
        }
      })
      .finally(() => setLoading(false));
  }, [status, router]);

  async function saveProfile() {
    setSavingProfile(true);
    const res = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const json = await res.json();
    if (json.data) {
      setUser((u: any) => ({ ...u, ...json.data }));
      setEditingProfile(false);
      showToast('Profile updated!');
    } else {
      showToast(json.error ?? 'Failed to update', 'error');
    }
    setSavingProfile(false);
  }

  async function savePassword() {
    setPasswordError(null);
    if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match'); return; }
    if (newPassword.length < 8) { setPasswordError('Password must be at least 8 characters'); return; }
    setSavingPassword(true);
    const res = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const json = await res.json();
    if (json.data) {
      setShowPasswordForm(false);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      showToast('Password updated!');
    } else {
      setPasswordError(json.error ?? 'Failed to update password');
    }
    setSavingPassword(false);
  }

  function handleChatSend(e: React.FormEvent) {
    e.preventDefault();
    if (!chatInput.trim()) return;
    setChatInput('');
  }

  const role = (session?.user as any)?.role ?? user?.role;
  const upcomingGames = DUMMY_GAMES.filter(g => !g.result);
  const pastGames     = DUMMY_GAMES.filter(g =>  g.result);

  if (loading || status === 'loading') {
    return (
      <div className="flex min-h-screen bg-navy">
        <Sidebar />
        <main className="flex-1 ml-14 md:ml-64 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </main>
      </div>
    );
  }

  const displayName = user?.firstName
    ? `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
    : user?.name || 'Player';
  const initials = displayName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen bg-navy">
      <Sidebar />

      <main className="flex-1 ml-14 md:ml-64 p-4 md:p-8">
        <div className="max-w-3xl mx-auto">

          {toast && (
            <div className={`fixed top-4 right-4 z-50 font-semibold px-4 py-2 rounded-lg shadow-lg text-sm ${
              toastType === 'success' ? 'bg-accent text-navy' : 'bg-red-500 text-white'
            }`}>{toast}</div>
          )}

          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-14 h-14 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center text-accent font-black text-lg flex-shrink-0">
              {user?.avatarUrl
                ? <img src={user.avatarUrl} alt={displayName} className="w-full h-full rounded-full object-cover" />
                : initials}
            </div>
            <div>
              <h1 className="text-2xl font-black text-white leading-tight">{displayName}</h1>
              <p className="text-gray-400 text-sm mt-0.5">
                {role === 'CAPTAIN' ? '⭐ Team Captain' : '🏃 Player'} · {user?.email}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 bg-surface border border-white/[0.06] rounded-2xl p-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                  activeTab === tab.id
                    ? 'bg-accent text-navy shadow-sm'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="hidden sm:inline">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── PROFILE TAB ─────────────────────────────────────── */}
          {activeTab === 'profile' && (
            <div className="space-y-5">
              <Card>
                <div className="flex items-start justify-between mb-5">
                  <div>
                    <h2 className="text-lg font-bold text-white">Personal Info</h2>
                    <p className="text-gray-400 text-sm mt-0.5">Update your name, contact, and address</p>
                  </div>
                  {!editingProfile && (
                    <button onClick={() => setEditingProfile(true)} className="text-sm text-accent hover:underline font-medium">Edit</button>
                  )}
                </div>

                {editingProfile ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="First Name" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Jane" />
                      <Input label="Last Name"  value={form.lastName}  onChange={e => setForm(f => ({ ...f, lastName:  e.target.value }))} placeholder="Smith" />
                    </div>
                    <Input label="Phone" type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="(555) 000-0000" />
                    <Input label="Street Address" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St" />
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="City" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Cedar Rapids" />
                      <div className="space-y-1.5">
                        <label className="block text-sm font-medium text-gray-300">State</label>
                        <select
                          value={form.state}
                          onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                          className="w-full bg-navy border border-white/10 rounded-lg text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 hover:border-white/20 transition-all"
                        >
                          <option value="" className="bg-navy">— Select —</option>
                          {US_STATES.map(s => <option key={s} value={s} className="bg-navy">{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <Input label="ZIP Code" value={form.zip} onChange={e => setForm(f => ({ ...f, zip: e.target.value }))} placeholder="52401" />
                    <div className="flex gap-3 pt-2">
                      <Button onClick={saveProfile} loading={savingProfile}>Save Changes</Button>
                      <Button variant="ghost" onClick={() => setEditingProfile(false)}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-white/[0.06]">
                    {[
                      { label: 'First Name', value: user?.firstName },
                      { label: 'Last Name',  value: user?.lastName  },
                      { label: 'Email',      value: user?.email     },
                      { label: 'Phone',      value: user?.phone     },
                      { label: 'Address',    value: user?.address   },
                      { label: 'City',       value: user?.city      },
                      { label: 'State',      value: user?.state     },
                      { label: 'ZIP',        value: user?.zip       },
                    ].map(row => (
                      <div key={row.label} className="flex items-center justify-between py-3">
                        <span className="text-xs text-gray-500 uppercase tracking-wide w-28 flex-shrink-0">{row.label}</span>
                        <span className="text-white text-sm text-right">{row.value || <span className="text-gray-600 italic">Not set</span>}</span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              <Card>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h2 className="text-lg font-bold text-white">Password</h2>
                    <p className="text-gray-400 text-sm mt-0.5">Keep your account secure</p>
                  </div>
                  <button onClick={() => setShowPasswordForm(o => !o)} className="text-sm text-accent hover:underline font-medium">
                    {showPasswordForm ? 'Cancel' : 'Change'}
                  </button>
                </div>
                {!showPasswordForm && <p className="text-gray-600 text-sm">••••••••</p>}
                {showPasswordForm && (
                  <div className="mt-4 space-y-3">
                    {passwordError && (
                      <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg">{passwordError}</div>
                    )}
                    <Input label="Current Password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} placeholder="Enter current password" />
                    <Input label="New Password"      type="password" value={newPassword}     onChange={e => setNewPassword(e.target.value)}     placeholder="At least 8 characters" />
                    <Input label="Confirm Password"  type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repeat new password" />
                    <Button onClick={savePassword} loading={savingPassword} className="w-full">Update Password</Button>
                  </div>
                )}
              </Card>
            </div>
          )}

          {/* ── MY TEAM TAB ─────────────────────────────────────── */}
          {activeTab === 'team' && (
            <div className="space-y-5">
              {user?.captainedTeams?.length > 0 && user.captainedTeams.map((team: any) => (
                <Card key={team.id}>
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-2xl">🏅</span>
                        <h2 className="text-xl font-black text-white">{team.name}</h2>
                        <Badge variant="warning">Captain</Badge>
                      </div>
                      <p className="text-gray-400 text-sm mt-1">
                        {team.league?.name}{team.season ? ` · ${team.season.name}` : ''}
                      </p>
                    </div>
                    {team.league?.slug && (
                      <a href={`/leagues/${team.league.slug}`} className="text-xs text-accent hover:underline font-medium flex-shrink-0">League page →</a>
                    )}
                  </div>
                  <div className="bg-navy border border-white/[0.06] rounded-xl p-4 text-sm text-gray-400 text-center">
                    Roster management coming soon.
                  </div>
                </Card>
              ))}

              {user?.registrations?.length > 0 && (
                <Card>
                  <h2 className="text-lg font-bold text-white mb-1">Season Registrations</h2>
                  <p className="text-gray-400 text-sm mb-5">Leagues you're registered in</p>
                  <div className="divide-y divide-white/[0.06]">
                    {user.registrations.map((reg: any) => (
                      <div key={reg.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="text-white font-medium text-sm">{reg.season?.league?.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{reg.season?.name}</p>
                        </div>
                        <Badge variant={reg.status === 'ACTIVE' ? 'success' : reg.status === 'PENDING' ? 'warning' : 'default'}>
                          {reg.status.charAt(0) + reg.status.slice(1).toLowerCase()}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {!user?.captainedTeams?.length && !user?.registrations?.length && (
                <Card>
                  <div className="text-center py-10">
                    <div className="text-5xl mb-3">🏅</div>
                    <p className="text-white font-semibold mb-1">Not on a team yet</p>
                    <p className="text-gray-400 text-sm">Register for a season to join or create a team.</p>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ── SCHEDULE TAB ────────────────────────────────────── */}
          {activeTab === 'schedule' && (
            <div className="space-y-5">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-yellow-300 text-sm flex items-center gap-2">
                <span>🚧</span>
                <span>Scheduling is coming soon. Below is a preview of what it'll look like.</span>
              </div>

              <Card>
                <h2 className="text-lg font-bold text-white mb-4">Upcoming Games</h2>
                <div className="space-y-3">
                  {upcomingGames.map(game => (
                    <div key={game.id} className="flex items-center gap-4 p-3 bg-navy rounded-xl border border-white/[0.06]">
                      <div className="text-center w-16 flex-shrink-0">
                        <p className="text-accent font-black text-sm leading-tight">{game.date.split(',')[0]}</p>
                        <p className="text-white text-xs">{game.date.split(', ')[1]}</p>
                      </div>
                      <div className="w-px h-10 bg-white/10 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm">vs {game.opponent}</p>
                        <p className="text-gray-400 text-xs mt-0.5 truncate">📍 {game.location} · {game.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h2 className="text-lg font-bold text-white mb-4">Recent Results</h2>
                <div className="space-y-3">
                  {pastGames.map(game => (
                    <div key={game.id} className="flex items-center gap-4 p-3 bg-navy rounded-xl border border-white/[0.06]">
                      <div className="text-center w-16 flex-shrink-0">
                        <p className="text-gray-400 font-bold text-sm leading-tight">{game.date.split(',')[0]}</p>
                        <p className="text-gray-500 text-xs">{game.date.split(', ')[1]}</p>
                      </div>
                      <div className="w-px h-10 bg-white/10 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-semibold text-sm">vs {game.opponent}</p>
                        <p className="text-gray-400 text-xs mt-0.5 truncate">📍 {game.location}</p>
                      </div>
                      <span className={`text-xs font-black px-2.5 py-1 rounded-full flex-shrink-0 ${
                        game.result?.startsWith('W') ? 'bg-accent/20 text-accent' :
                        game.result?.startsWith('L') ? 'bg-red-500/20 text-red-400' :
                        'bg-gray-500/20 text-gray-400'
                      }`}>{game.result}</span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ── CHAT TAB ────────────────────────────────────────── */}
          {activeTab === 'chat' && (
            <div className="space-y-5">
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-3 text-yellow-300 text-sm flex items-center gap-2">
                <span>🚧</span>
                <span>Chat is coming soon. Below is a preview of what it'll look like.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1 space-y-2">
                  {DUMMY_ROOMS.map(room => (
                    <button
                      key={room.id}
                      onClick={() => setActiveRoom(room)}
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-150 ${
                        activeRoom.id === room.id
                          ? 'bg-accent/10 border-accent/30'
                          : 'bg-surface border-white/[0.06] hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-sm font-semibold">{room.icon} {room.name}</span>
                        {room.unread > 0 && (
                          <span className="bg-accent text-navy text-xs font-black rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0">{room.unread}</span>
                        )}
                      </div>
                      <p className="text-gray-500 text-xs truncate">{room.lastMessage}</p>
                      <p className="text-gray-600 text-xs mt-0.5">{room.time}</p>
                    </button>
                  ))}
                </div>

                <div className="md:col-span-2 bg-surface border border-white/[0.06] rounded-2xl flex flex-col" style={{ height: '420px' }}>
                  <div className="px-4 py-3 border-b border-white/[0.06] flex-shrink-0">
                    <p className="text-white font-semibold text-sm">{activeRoom.icon} {activeRoom.name}</p>
                  </div>
                  <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                    {activeRoom.messages.map((msg, i) => (
                      <div key={i} className={`flex flex-col ${msg.self ? 'items-end' : 'items-start'}`}>
                        {!msg.self && <span className="text-xs text-gray-500 mb-1 px-1">{msg.from}</span>}
                        <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                          msg.self
                            ? 'bg-accent text-navy rounded-br-sm font-medium'
                            : 'bg-navy border border-white/[0.06] text-white rounded-bl-sm'
                        }`}>{msg.text}</div>
                        <span className="text-xs text-gray-600 mt-1 px-1">{msg.time}</span>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleChatSend} className="px-3 py-3 border-t border-white/[0.06] flex gap-2 flex-shrink-0">
                    <input
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder="Type a message…"
                      className="flex-1 bg-navy border border-white/10 rounded-xl text-white text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent/50 placeholder-gray-600"
                    />
                    <button type="submit" className="bg-accent hover:bg-accent/90 text-navy font-bold px-4 py-2 rounded-xl text-sm transition-colors">
                      Send
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

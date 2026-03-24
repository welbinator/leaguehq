'use client';

import { ChatRoom } from '@/components/chat/ChatRoom';

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


// ─── Player Schedule Tab Component ───────────────────────────────────────────

function PlayerScheduleTab({ userId }: { userId?: string }) {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return; // stay in loading state until userId is available
    setLoading(true);
    fetch(`/api/games?userId=${userId}`)
      .then(r => r.json())
      .then(j => setGames(j.data ?? []))
      .catch(() => setGames([]))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  const now = new Date();
  const upcoming = games.filter(g => new Date(g.scheduledAt) >= now);
  const past = games.filter(g => new Date(g.scheduledAt) < now).reverse();

  if (!games.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-4">📅</div>
      <h3 className="text-xl font-bold text-white mb-2">No games scheduled yet</h3>
      <p className="text-gray-400 text-sm">Your games will appear here once the league director publishes a schedule.</p>
    </div>
  );

  const renderGame = (game: any, i: number, arr: any[], isPast: boolean) => {
    const d = new Date(game.scheduledAt);
    const month = d.toLocaleDateString('en-US', { month: 'short' });
    const day = d.getDate();
    const weekday = d.toLocaleDateString('en-US', { weekday: 'short' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

    return (
      <div key={game.id} className="flex items-center gap-4 p-3 bg-navy rounded-xl border border-white/[0.06]">
        <div className="text-center w-16 flex-shrink-0">
          <p className={`font-black text-sm leading-tight ${isPast ? 'text-gray-400' : 'text-accent'}`}>{weekday}</p>
          <p className={`text-lg font-black ${isPast ? 'text-gray-500' : 'text-white'}`}>{day}</p>
          <p className="text-xs text-gray-500">{month}</p>
        </div>
        <div className="w-px h-10 bg-white/10 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm">
            {game.homeTeam?.name} <span className="text-gray-500 font-normal">vs</span> {game.awayTeam?.name}
          </p>
          <p className="text-gray-400 text-xs mt-0.5 truncate">
            {game.location && `📍 ${game.location} · `}{time}
            {game.division && ` · ${game.division.name}`}
          </p>
        </div>
        {game.status === 'COMPLETED' && game.homeScore != null && (
          <span className="text-accent font-black text-sm">{game.homeScore}–{game.awayScore}</span>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-5">
      {upcoming.length > 0 && (
        <Card>
          <h2 className="text-lg font-bold text-white mb-4">Upcoming Games</h2>
          <div className="space-y-3">
            {upcoming.map((g, i, a) => renderGame(g, i, a, false))}
          </div>
        </Card>
      )}
      {past.length > 0 && (
        <Card>
          <h2 className="text-lg font-bold text-white mb-4">Recent Results</h2>
          <div className="space-y-3 opacity-80">
            {past.map((g, i, a) => renderGame(g, i, a, true))}
          </div>
        </Card>
      )}
    </div>
  );
}


function PlayerChatTab({ userId }: { userId?: string }) {
  const [rooms, setRooms] = useState<any[]>([]);
  const [activeRoom, setActiveRoom] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetch('/api/chat/rooms')
      .then(r => r.json())
      .then(j => {
        const r = j.data ?? [];
        setRooms(r);
        if (r.length > 0) setActiveRoom(r[0]);
      })
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (!rooms.length) return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-4xl mb-3">💬</div>
      <h3 className="text-lg font-bold text-white mb-1">No chats yet</h3>
      <p className="text-gray-400 text-sm">Your league director hasn't enabled chat yet.</p>
    </div>
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-1">
        {rooms.map(room => (
          <button
            key={room.id}
            onClick={() => setActiveRoom(room)}
            className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-colors ${
              activeRoom?.id === room.id
                ? 'bg-accent/10 border border-accent/30 text-white'
                : 'text-gray-400 hover:text-white hover:bg-white/[0.04] border border-transparent'
            }`}
          >
            <div className="font-medium">{room.type === 'TEAM' ? '👥' : '🏆'} {room.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">{room.type === 'TEAM' ? 'Team Chat' : 'Season Chat'}</div>
          </button>
        ))}
      </div>
      <div className="md:col-span-2 bg-surface border border-white/[0.08] rounded-2xl overflow-hidden">
        {activeRoom && userId ? (
          <ChatRoom roomId={activeRoom.id} currentUserId={userId} roomName={activeRoom.name} />
        ) : (
          <div className="flex items-center justify-center h-full py-16 text-gray-500 text-sm">Select a chat</div>
        )}
      </div>
    </div>
  );
}

export default function PlayerDashboard() {
  const sessionResult = useSession();
  const session = sessionResult?.data;
  const status = sessionResult?.status;
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
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);

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
          {activeTab === 'team' && (() => {
            // Consolidate all teams from captainedTeams, registrations, and teamMemberships
            const seen = new Set<string>();
            const allTeams: any[] = [];

            // Captained teams first
            (user?.captainedTeams || []).forEach((t: any) => {
              if (!seen.has(t.id)) { seen.add(t.id); allTeams.push({ ...t, isCaptain: true }); }
            });
            // Teams from registrations
            (user?.registrations || []).forEach((r: any) => {
              if (r.team && !seen.has(r.team.id)) {
                seen.add(r.team.id);
                allTeams.push({ ...r.team, isCaptain: r.team.captainId === user?.id, regStatus: r.status });
              }
            });
            // Teams from TeamMember records
            (user?.teamMemberships || []).forEach((m: any) => {
              if (m.team && !seen.has(m.team.id)) {
                seen.add(m.team.id);
                allTeams.push({ ...m.team, isCaptain: m.team.captainId === user?.id, memberRole: m.role });
              }
            });

            const activeTeam = allTeams.find(t => t.id === selectedTeamId) ?? allTeams[0] ?? null;

            if (allTeams.length === 0) {
              return (
                <Card>
                  <div className="text-center py-10">
                    <div className="text-5xl mb-3">🏅</div>
                    <p className="text-white font-semibold mb-1">Not on a team yet</p>
                    <p className="text-gray-400 text-sm">Register for a season to join or create a team.</p>
                  </div>
                </Card>
              );
            }

            return (
              <div className="space-y-5">
                {/* Team selector — only show if on multiple teams */}
                {allTeams.length > 1 && (
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-gray-400 uppercase tracking-wide">Select Team</label>
                    <div className="flex flex-wrap gap-2">
                      {allTeams.map((t: any) => (
                        <button
                          key={t.id}
                          onClick={() => setSelectedTeamId(t.id)}
                          className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all duration-150 ${
                            (selectedTeamId ?? allTeams[0]?.id) === t.id
                              ? 'bg-accent text-navy border-accent'
                              : 'bg-surface border-white/[0.06] text-gray-300 hover:border-white/20'
                          }`}
                        >
                          {t.name}
                          {t.isCaptain && <span className="ml-1.5 text-xs">⭐</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {activeTeam && (
                  <Card>
                    <div className="flex items-start justify-between mb-5">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-2xl">🏅</span>
                          <h2 className="text-xl font-black text-white">{activeTeam.name}</h2>
                          {activeTeam.isCaptain && <Badge variant="warning">⭐ Captain</Badge>}
                          {activeTeam.memberRole === 'COACH' && <Badge variant="default">Coach</Badge>}
                        </div>
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-400">
                          {activeTeam.league?.name && <span>🏆 {activeTeam.league.name}</span>}
                          {activeTeam.season?.name && <span>📅 {activeTeam.season.name}</span>}
                          {activeTeam.division?.name && <span>📂 {activeTeam.division.name}</span>}
                        </div>
                      </div>
                      {activeTeam.league?.slug && (
                        <a href={`/leagues/${activeTeam.league.slug}`} className="text-xs text-accent hover:underline font-medium flex-shrink-0">League page →</a>
                      )}
                    </div>

                    {/* Roster — shown if we have member data (captained teams include it) */}
                    {activeTeam.members?.length > 0 ? (
                      <div>
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Roster</h3>
                        <div className="divide-y divide-white/[0.06]">
                          {activeTeam.members.map((m: any) => {
                            const memberName = m.user?.firstName
                              ? `${m.user.firstName}${m.user.lastName ? ' ' + m.user.lastName : ''}`
                              : m.user?.name || 'Unknown';
                            const initials = memberName.split(' ').map((w: string) => w[0]).join('').slice(0,2).toUpperCase();
                            return (
                              <div key={m.id} className="flex items-center gap-3 py-2.5">
                                <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/20 flex items-center justify-center text-accent text-xs font-bold flex-shrink-0">
                                  {initials}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-white text-sm font-medium">
                                    {memberName}
                                    {m.user?.id === user?.id && <span className="text-gray-500 text-xs ml-1">(you)</span>}
                                  </p>
                                </div>
                                <span className="text-xs text-gray-500 capitalize">{m.role?.toLowerCase()}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-navy border border-white/[0.06] rounded-xl p-4 text-sm text-gray-500 text-center">
                        Full roster visible to team captains.
                      </div>
                    )}
                  </Card>
                )}

                {/* Registration statuses */}
                {user?.registrations?.some((r: any) => r.team) && (
                  <Card>
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Registration Status</h3>
                    <div className="divide-y divide-white/[0.06]">
                      {user.registrations.filter((r: any) => r.team).map((reg: any) => (
                        <div key={reg.id} className="flex items-center justify-between py-3">
                          <div>
                            <p className="text-white text-sm font-medium">{reg.team?.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{reg.season?.league?.name} · {reg.season?.name}</p>
                          </div>
                          <Badge variant={reg.status === 'ACTIVE' ? 'success' : reg.status === 'PENDING' ? 'warning' : 'default'}>
                            {reg.status.charAt(0) + reg.status.slice(1).toLowerCase()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </div>
            );
          })()}

          {/* ── SCHEDULE TAB ────────────────────────────────────── */}
          {activeTab === 'schedule' && (
            <PlayerScheduleTab userId={user?.id ?? (session?.user as any)?.id} />
          )}

          {/* ── CHAT TAB ────────────────────────────────────────── */}
          {activeTab === 'chat' && (
            <PlayerChatTab userId={user?.id ?? (session?.user as any)?.id} />
          )}
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

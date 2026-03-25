'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

const TIER_LABELS: Record<string, string> = {
  FREE: 'Free',
  STARTER: 'Starter',
  GROWTH: 'Growth',
  PRO: 'Pro',
};

const TIER_COLOR: Record<string, string> = {
  FREE: 'bg-gray-500/20 text-gray-400',
  STARTER: 'bg-blue-500/20 text-blue-400',
  GROWTH: 'bg-purple-500/20 text-purple-400',
  PRO: 'bg-accent/20 text-accent',
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  ACTIVE: 'success',
  TRIALING: 'warning',
  PAST_DUE: 'danger',
  CANCELLED: 'default',
  UNPAID: 'danger',
};

const ROLE_LABEL: Record<string, string> = {
  LEAGUE_ADMIN: 'League Director',
  SUPER_ADMIN: 'Super Admin',
  CAPTAIN: 'Team Captain',
  PLAYER: 'Player',
  COACH: 'Coach',
  REFEREE: 'Referee',
};

const SPORT_EMOJI: Record<string, string> = {
  Soccer: '⚽', Basketball: '🏀', Baseball: '⚾', Football: '🏈',
  Volleyball: '🏐', Tennis: '🎾', Hockey: '🏒', Softball: '🥎',
  Lacrosse: '🥍', Rugby: '🏉', Other: '🏆',
};

export default function AccountPage() {
  const sessionResult = useSession();
  const session = sessionResult?.data;
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Profile edit
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);

  // Password change
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  function showToast(msg: string, type: 'success' | 'error' = 'success') {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3000);
  }

  async function loadAccount() {
    const res = await fetch('/api/account');
    const json = await res.json();
    if (json.data) {
      setUser(json.data);
      setName(json.data.name);
    }
    setLoading(false);
  }

  useEffect(() => { loadAccount(); }, []);

  async function saveName() {
    setSavingName(true);
    const res = await fetch('/api/account', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    if (json.data) {
      setUser((u: any) => ({ ...u, name: json.data.name }));
      setEditingName(false);
      showToast('Name updated!');
    } else {
      showToast(json.error ?? 'Failed to update', 'error');
    }
    setSavingName(false);
  }

  async function savePassword() {
    setPasswordError(null);
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
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

  const role = (session?.user as any)?.role ?? user?.role;
  const isDirector = role === 'LEAGUE_ADMIN' || role === 'SUPER_ADMIN';
  const isPlayerOrCaptain = role === 'PLAYER' || role === 'CAPTAIN';

  if (loading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy">
      {/* Top nav */}
      <header className="bg-surface border-b border-white/[0.06] sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          <span className="text-white font-bold text-sm">My Account</span>

              {/* Push Notifications */}
              <div className="flex items-center justify-between p-4 bg-white/[0.03] rounded-xl border border-white/[0.08]">
                <div>
                  <p className="text-sm font-semibold text-white">Push Notifications</p>
                  <p className="text-xs text-gray-500 mt-0.5">Get notified about chat messages and league updates</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    const newVal = !user?.pushNotificationsEnabled;
                    await fetch('/api/account', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ pushNotificationsEnabled: newVal }),
                    });
                    setUser((u: any) => ({ ...u, pushNotificationsEnabled: newVal }));
                    if (!newVal) {
                      // Unsubscribe this device
                      if ('serviceWorker' in navigator) {
                        const reg = await navigator.serviceWorker.ready;
                        const sub = await reg.pushManager.getSubscription();
                        if (sub) {
                          await fetch('/api/push/unsubscribe', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ endpoint: sub.endpoint }),
                          });
                          await sub.unsubscribe();
                        }
                      }
                    }
                  }}
                  className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ml-4 ${user?.pushNotificationsEnabled ? 'bg-accent' : 'bg-white/10'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${user?.pushNotificationsEnabled ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

          <Link href={user?.role === 'PLAYER' || user?.role === 'CAPTAIN' ? '/dashboard/player' : '/dashboard'} className="text-sm text-gray-400 hover:text-white transition-colors">
            ← Dashboard
          </Link>
        </div>
      </header>

      {toast && (
        <div className={`fixed top-4 right-4 z-50 font-semibold px-4 py-2 rounded-lg shadow-lg text-sm animate-fade-in ${
          toastType === 'success' ? 'bg-accent text-navy' : 'bg-red-500 text-white'
        }`}>
          {toast}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        {/* Profile Card */}
        <Card>
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Profile</h2>
              <p className="text-gray-400 text-sm mt-0.5">Your account information</p>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${TIER_COLOR['FREE']}`}>
              {ROLE_LABEL[role] ?? role}
            </span>
          </div>

          <div className="space-y-4">
            {/* Name */}
            <div className="flex items-center justify-between py-3 border-b border-white/[0.06]">
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Name</p>
                {editingName ? (
                  <div className="flex items-center gap-2 mt-1">
                    <input
                      className="flex-1 bg-navy border border-white/10 rounded-lg text-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false); }}
                      autoFocus
                    />
                    <Button onClick={saveName} loading={savingName}>Save</Button>
                    <Button variant="ghost" onClick={() => { setEditingName(false); setName(user.name); }}>Cancel</Button>
                  </div>
                ) : (
                  <p className="text-white font-medium">{user.name}</p>
                )}
              </div>
              {!editingName && (
                <button onClick={() => setEditingName(true)} className="text-xs text-accent hover:underline ml-4 flex-shrink-0">
                  Edit
                </button>
              )}
            </div>

            {/* Email */}
            <div className="py-3 border-b border-white/[0.06]">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Email</p>
              <p className="text-white font-medium">{user.email}</p>
              <p className="text-xs text-gray-500 mt-0.5">Email address cannot be changed</p>
            </div>

            {/* Member since */}
            <div className="py-3 border-b border-white/[0.06]">
              <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Member Since</p>
              <p className="text-white font-medium">
                {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
              </p>
            </div>

            {/* Password */}
            <div className="py-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Password</p>
                  <p className="text-white font-medium">••••••••</p>
                </div>
                <button
                  onClick={() => setShowPasswordForm(o => !o)}
                  className="text-xs text-accent hover:underline"
                >
                  {showPasswordForm ? 'Cancel' : 'Change'}
                </button>
              </div>

              {showPasswordForm && (
                <div className="mt-4 space-y-3 p-4 bg-navy rounded-xl border border-white/10">
                  {passwordError && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-3 py-2 rounded-lg">
                      {passwordError}
                    </div>
                  )}
                  <Input
                    label="Current Password"
                    type="password"
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                  />
                  <Input
                    label="New Password"
                    type="password"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                  />
                  <Input
                    label="Confirm New Password"
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                  />
                  <Button onClick={savePassword} loading={savingPassword} className="w-full">
                    Update Password
                  </Button>
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* League Director: My Leagues + Subscriptions */}
        {isDirector && user.ownedLeagues?.length > 0 && (
          <Card>
            <h2 className="text-xl font-bold text-white mb-1">My Leagues</h2>
            <p className="text-gray-400 text-sm mb-5">Subscription status for each league you manage</p>
            <div className="space-y-4">
              {user.ownedLeagues.map((league: any) => (
                <div key={league.id} className="p-4 bg-navy rounded-xl border border-white/10">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{SPORT_EMOJI[league.sport] ?? '🏆'}</span>
                      <div>
                        <Link href={`/leagues/${league.slug}`} className="text-white font-semibold hover:text-accent transition-colors">
                          {league.name}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TIER_COLOR[league.subscriptionTier] ?? TIER_COLOR.FREE}`}>
                            {TIER_LABELS[league.subscriptionTier] ?? league.subscriptionTier} Plan
                          </span>
                          <Badge variant={STATUS_VARIANT[league.subscriptionStatus] ?? 'default'} dot>
                            {league.subscriptionStatus.charAt(0) + league.subscriptionStatus.slice(1).toLowerCase().replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${league.stripeConnectAccountId ? 'bg-accent' : 'bg-yellow-400'}`} />
                      <span className="text-gray-400">
                        {league.stripeConnectAccountId ? 'Stripe connected' : 'Stripe not connected'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Player/Captain: Recent Registrations */}
        {isPlayerOrCaptain && (
          <>
            {user.captainedTeams?.length > 0 && (
              <Card>
                <h2 className="text-xl font-bold text-white mb-1">My Teams</h2>
                <p className="text-gray-400 text-sm mb-5">Teams you captain</p>
                <div className="space-y-3">
                  {user.captainedTeams.map((team: any) => (
                    <div key={team.id} className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-0">
                      <div>
                        <p className="text-white font-medium">{team.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {team.league?.name}{team.season ? ` · ${team.season.name}` : ''}
                        </p>
                      </div>
                      {team.league?.slug && (
                        <Link href={`/leagues/${team.league.slug}`} className="text-xs text-accent hover:underline">
                          View League →
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {user.playerRegistrations?.length > 0 && (
              <Card>
                <h2 className="text-xl font-bold text-white mb-1">Recent Registrations</h2>
                <p className="text-gray-400 text-sm mb-5">Your last 5 season registrations</p>
                <div className="space-y-3">
                  {user.playerRegistrations.map((reg: any) => (
                    <div key={reg.id} className="flex items-center justify-between py-3 border-b border-white/[0.06] last:border-0">
                      <div>
                        <p className="text-white font-medium">{reg.season?.league?.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{reg.season?.name}</p>
                      </div>
                      <Badge variant={reg.status === 'ACTIVE' ? 'success' : reg.status === 'PENDING' ? 'warning' : 'default'}>
                        {reg.status.charAt(0) + reg.status.slice(1).toLowerCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {user.playerRegistrations?.length === 0 && user.captainedTeams?.length === 0 && (
              <Card>
                <div className="text-center py-8">
                  <div className="text-4xl mb-3">🏅</div>
                  <p className="text-gray-400 text-sm">No registrations yet. Join a league to get started.</p>
                </div>
              </Card>
            )}
          </>
        )}

      </div>
    </div>
  );
}

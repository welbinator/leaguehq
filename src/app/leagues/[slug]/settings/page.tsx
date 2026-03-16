'use client';

import { Card, CardHeader } from '@/components/ui/Card';
import { LeagueNav } from '@/components/league/LeagueNav';
import { Button } from '@/components/ui/Button';

interface SettingsPageProps {
  params: { slug: string };
}

export default function SettingsPage({ params }: SettingsPageProps) {
  return (
    <div className="min-h-screen bg-navy">
      <LeagueNav slug={params.slug} />
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="mb-8">
          <h2 className="text-2xl font-black text-white">League Settings</h2>
          <p className="text-gray-400">Manage your league configuration and preferences.</p>
        </div>

        {/* General */}
        <Card>
          <CardHeader title="General" subtitle="Basic league information" />
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-300">League Name</label>
              <input
                defaultValue="Cedar Rapids Adult Soccer"
                className="w-full bg-navy border border-white/10 rounded-lg text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-300">Sport</label>
              <input
                defaultValue="Soccer"
                className="w-full bg-navy border border-white/10 rounded-lg text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-300">Description</label>
              <textarea
                rows={3}
                defaultValue="Competitive adult soccer league with 3 divisions."
                className="w-full bg-navy border border-white/10 rounded-lg text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none"
              />
            </div>
            <Button>Save Changes</Button>
          </div>
        </Card>

        {/* Roster Settings */}
        <Card>
          <CardHeader title="Roster Settings" subtitle="Control how rosters are managed" />
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-gray-300">Roster Managed By</label>
              <select className="w-full bg-navy border border-white/10 rounded-lg text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50">
                <option value="COACH">Coach</option>
                <option value="CAPTAIN">Captain</option>
                <option value="BOTH">Both Coach & Captain</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-300">Min Roster Size</label>
                <input type="number" defaultValue={11} min={1} className="w-full bg-navy border border-white/10 rounded-lg text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-300">Max Roster Size</label>
                <input type="number" defaultValue={20} min={1} className="w-full bg-navy border border-white/10 rounded-lg text-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50" />
              </div>
            </div>
            <Button>Save Settings</Button>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card>
          <CardHeader title="Danger Zone" subtitle="Irreversible actions" />
          <div className="space-y-3">
            <p className="text-sm text-gray-400">
              Deleting your league will permanently remove all associated data including teams, players, schedules, and payment records. This cannot be undone.
            </p>
            <Button variant="danger">Delete League</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

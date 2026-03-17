import type { Metadata, Viewport } from 'next';
import { ServiceWorkerRegistration } from '@/components/ServiceWorkerRegistration';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'LeagueHQ — Sports League Management',
    template: '%s | LeagueHQ',
  },
  description:
    'Run your sports league effortlessly. Manage schedules, rosters, payments, and communication all in one place.',
  keywords: ['sports league', 'league management', 'team management', 'sports scheduling'],
  authors: [{ name: 'LeagueHQ' }],
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/icon-192.png',
  },
  openGraph: {
    title: 'LeagueHQ — Sports League Management',
    description: 'Run your sports league effortlessly.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LeagueHQ — Sports League Management',
    description: 'Run your sports league effortlessly.',
  },
};

export const viewport: Viewport = {
  themeColor: '#22c55e',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-navy min-h-screen"><ServiceWorkerRegistration />{children}</body>
    </html>
  );
}

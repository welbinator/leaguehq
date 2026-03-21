import { Sidebar } from '@/components/layout/Sidebar';
import { LeagueNav } from '@/components/league/LeagueNav';

interface LeagueLayoutProps {
  children: React.ReactNode;
  params: { slug: string };
}

export default function LeagueLayout({ children, params }: LeagueLayoutProps) {
  const { slug } = params;

  return (
    <div className="flex min-h-screen bg-navy">
      <Sidebar />

      {/* Main content: offset for sidebar */}
      <div className="flex-1 ml-14 md:ml-64 flex flex-col min-h-screen">
        <LeagueNav slug={slug} />
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

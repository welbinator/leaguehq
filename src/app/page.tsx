import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PRICING_TIERS } from '@/types';

const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    title: 'League Management',
    description:
      'Create and manage multiple leagues with divisions, seasons, and custom settings. Full control from one dashboard.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Team Rosters',
    description:
      'Coaches and captains manage their own rosters. Player registration, status tracking, and multi-team support built in.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Smart Scheduling',
    description:
      'Build and publish game schedules in minutes. Automatic conflict detection, location management, and real-time updates.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
    title: 'Online Payments',
    description:
      'Collect registration fees and season dues online. Stripe-powered checkout, payment tracking, and automatic receipts.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: 'Team Chat',
    description:
      'Keep everyone in the loop with built-in messaging. Team channels, league announcements, and direct messages.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Live Standings',
    description:
      'Standings update automatically after every game. Stats, win/loss records, and playoff seeding calculated in real time.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-navy">
      <Navbar />

      {/* Hero */}
      <section className="relative pt-32 pb-24 overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-accent/5 rounded-full blur-3xl" />
          <div className="absolute top-20 -left-40 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.015]"
            style={{
              backgroundImage:
                'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
              backgroundSize: '32px 32px',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-accent/10 border border-accent/20 text-accent text-sm font-medium px-4 py-2 rounded-full mb-8">
            <span className="w-2 h-2 bg-accent rounded-full animate-pulse" />
            Now in public beta — free to try
          </div>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.05] tracking-tight mb-6">
            Run Your League.
            <br />
            <span className="text-gradient-green">Not Your Stress.</span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            LeagueHQ gives sports organizers everything they need to run a professional league — scheduling, rosters, payments, and real-time communication — without the spreadsheet chaos.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-bold px-8 py-4 rounded-xl text-lg transition-all duration-200 shadow-2xl shadow-accent/25 hover:shadow-accent/40 hover:-translate-y-0.5"
            >
              Get Started Free
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <Link
              href="#features"
              className="inline-flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold px-8 py-4 rounded-xl text-lg transition-all duration-200"
            >
              See How It Works
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </Link>
          </div>

          {/* Social proof */}
          <div className="mt-16 flex flex-col sm:flex-row items-center justify-center gap-8 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              No credit card required
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Set up in minutes
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-accent" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Cancel anytime
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">
              Everything your league needs
            </h2>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              Stop juggling email threads, spreadsheets, and Venmo. LeagueHQ puts all your league operations in one clean, professional platform.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-surface border border-white/[0.06] rounded-2xl p-6 hover:border-white/10 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/20 transition-all duration-200"
              >
                <div className="w-12 h-12 bg-accent/10 border border-accent/20 rounded-xl flex items-center justify-center text-accent mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">Up and running in 3 steps</h2>
            <p className="text-lg text-gray-400">No tech background needed. If you can use email, you can use LeagueHQ.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                title: 'Create Your League',
                description: 'Sign up, enter your league details, and configure your settings. Choose your sport, set roster rules, and define your seasons.',
              },
              {
                step: '02',
                title: 'Add Teams & Players',
                description: 'Invite coaches and players via email. They register through your branded signup page, and you approve or auto-assign them.',
              },
              {
                step: '03',
                title: 'Run Your Season',
                description: "Build your schedule, track scores, and let LeagueHQ handle the rest. Standings update live, payments process automatically.",
              },
            ].map((item) => (
              <div key={item.step} className="relative">
                <div className="text-6xl font-black text-white/[0.04] mb-4 leading-none">{item.step}</div>
                <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                <p className="text-gray-400 leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 border-t border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-white mb-4">Simple, transparent pricing</h2>
            <p className="text-lg text-gray-400">
              Start free. Upgrade when you're ready. No hidden fees, no per-player nickels and dimes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`relative bg-surface rounded-2xl p-8 flex flex-col ${
                  tier.highlighted
                    ? 'border-2 border-accent shadow-2xl shadow-accent/10 scale-105'
                    : 'border border-white/[0.06]'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-accent text-white text-xs font-bold px-4 py-1.5 rounded-full uppercase tracking-wide">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="text-xl font-bold text-white mb-1">{tier.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-white">${tier.price}</span>
                    <span className="text-gray-400">/month</span>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    {tier.maxPlayers ? `Up to ${tier.maxPlayers.toLocaleString()} players` : 'Unlimited players'}
                  </p>
                </div>

                <ul className="space-y-3 mb-8 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <svg
                        className={`w-5 h-5 flex-shrink-0 mt-0.5 ${tier.highlighted ? 'text-accent' : 'text-gray-400'}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-sm text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/register"
                  className={`block text-center font-bold py-3 px-6 rounded-xl transition-all duration-200 ${
                    tier.highlighted
                      ? 'bg-accent hover:bg-accent-hover text-white shadow-lg shadow-accent/25'
                      : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'
                  }`}
                >
                  Get Started
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-gray-500 mt-8">
            All plans include a 14-day free trial. No credit card required to start.
          </p>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-24 border-t border-white/[0.06]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="bg-gradient-to-br from-surface to-navy border border-white/[0.06] rounded-3xl p-12">
            <h2 className="text-4xl font-black text-white mb-4">
              Ready to run a better league?
            </h2>
            <p className="text-lg text-gray-400 mb-8 max-w-xl mx-auto">
              Join hundreds of league organizers who've ditched the chaos and moved to LeagueHQ.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-bold px-8 py-4 rounded-xl text-lg transition-all duration-200 shadow-2xl shadow-accent/25"
            >
              Start Free Today
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

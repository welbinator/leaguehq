import { Suspense } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PricingContent } from '@/components/pricing/PricingContent';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-navy">
      <Navbar />
      <div className="pt-32 pb-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h1 className="text-5xl font-black text-white mb-4">Simple, transparent pricing</h1>
            <p className="text-lg text-gray-400 max-w-2xl mx-auto">
              No hidden fees, no per-player charges. Pay one flat monthly rate and run your entire league.
            </p>
          </div>
          <Suspense fallback={<div className="flex justify-center py-16"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>}>
            <PricingContent />
          </Suspense>
        </div>
      </div>
      <Footer />
    </div>
  );
}

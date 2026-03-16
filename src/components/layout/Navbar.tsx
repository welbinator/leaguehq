'use client';

import Link from 'next/link';
import { useState } from 'react';

export function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-navy/80 backdrop-blur-md border-b border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-black text-white tracking-tight">
              League<span className="text-accent">HQ</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-gray-400 hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</Link>
            <Link href="#" className="text-sm text-gray-400 hover:text-white transition-colors">Docs</Link>
          </div>

          {/* CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm text-gray-300 hover:text-white transition-colors px-4 py-2 rounded-lg hover:bg-white/5"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-lg transition-all duration-200 shadow-lg shadow-accent/20"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden text-gray-400 hover:text-white p-2 rounded-lg hover:bg-white/5"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-surface border-t border-white/[0.06] px-4 py-4 space-y-2">
          <Link href="#features" className="block py-2 text-gray-300 hover:text-white">Features</Link>
          <Link href="#pricing" className="block py-2 text-gray-300 hover:text-white">Pricing</Link>
          <Link href="#" className="block py-2 text-gray-300 hover:text-white">Docs</Link>
          <div className="pt-4 border-t border-white/10 flex flex-col gap-2">
            <Link href="/login" className="block py-2 text-center text-gray-300 hover:text-white">Sign In</Link>
            <Link href="/register" className="block py-2 text-center bg-accent hover:bg-accent-hover text-white font-semibold rounded-lg">
              Get Started Free
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}

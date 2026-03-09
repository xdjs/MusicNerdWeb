import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import SearchBar from "./_components/nav/components/SearchBar";
import { ArrowRight, Database, Shield, Sparkles } from "lucide-react";

export const metadata: Metadata = {
  title: "RECXRD - Own Your Narrative",
  description:
    "The AI-powered source of truth for musicians. Aggregate your scattered lore, interviews, and history into one verified, machine-readable archive.",
  openGraph: {
    title: "RECXRD - Own Your Narrative",
    description:
      "The AI-powered source of truth for musicians. Aggregate your scattered lore, interviews, and history into one verified, machine-readable archive.",
  },
};

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">
        {/* Subtle background gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
        
        {/* Content */}
        <div className="max-w-4xl mx-auto text-center space-y-8 relative z-10">
          {/* Logo / Brand */}
          <div className="space-y-4">
            <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-white">
              RECXRD
            </h1>
            <p className="text-xl md:text-2xl text-white/60 font-light">
              Own your narrative.
            </p>
          </div>

          {/* Description */}
          <p className="text-lg md:text-xl text-white/40 max-w-2xl mx-auto leading-relaxed">
            RECXRD aggregates your scattered lore, interviews, and history into one verified, 
            machine-readable Source of Truth.
          </p>

          {/* Search Bar */}
          <div className="max-w-lg mx-auto pt-4">
            <p className="text-sm text-white/30 mb-3">Search the archive</p>
            <Suspense fallback={
              <div className="h-12 bg-white/5 rounded-lg animate-pulse" />
            }>
              <SearchBar autoFocus />
            </Suspense>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <Link 
              href="/prototype/dashboard"
              className="btn-primary flex items-center gap-2 group"
            >
              Artist Demo
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link 
              href="#features"
              className="btn-secondary"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Built for the modern artist
            </h2>
            <p className="text-white/40 max-w-xl mx-auto">
              Your career history is scattered across hundreds of interviews, articles, and social posts. 
              RECXRD brings it all together.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="glass-card p-8 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white/60" />
              </div>
              <h3 className="text-xl font-semibold text-white">AI-Powered Discovery</h3>
              <p className="text-white/40 leading-relaxed">
                Our AI continuously scans the web for interviews, articles, and mentions about you, 
                extracting key facts and lore.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="glass-card p-8 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                <Shield className="w-6 h-6 text-white/60" />
              </div>
              <h3 className="text-xl font-semibold text-white">Artist-Verified</h3>
              <p className="text-white/40 leading-relaxed">
                You control what goes into your archive. Review AI-found sources and approve only 
                what accurately represents your story.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="glass-card p-8 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center">
                <Database className="w-6 h-6 text-white/60" />
              </div>
              <h3 className="text-xl font-semibold text-white">Machine-Readable</h3>
              <p className="text-white/40 leading-relaxed">
                Your verified vault becomes the authoritative source for AI assistants, journalists, 
                and fans seeking accurate information.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-white/30 text-sm">
            RECXRD Prototype
          </div>
          <div className="text-white/30 text-sm">
            Made in Seattle
          </div>
        </div>
      </footer>
    </div>
  );
}

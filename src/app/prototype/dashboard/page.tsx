"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Check, 
  X, 
  ExternalLink, 
  Inbox, 
  CheckCircle2, 
  Clock,
  ChevronRight,
  Sparkles
} from "lucide-react";

// Mock data for prototype - simulating AI-discovered sources
interface VaultSource {
  id: string;
  url: string;
  title: string;
  snippet: string;
  type: "interview" | "review" | "lore" | "article";
  status: "pending" | "approved" | "rejected";
  discoveredAt: string;
}

const MOCK_ARTIST = {
  id: "demo-artist-123",
  name: "Demo Artist",
  image: "/default_pfp_pink.png",
};

const INITIAL_MOCK_SOURCES: VaultSource[] = [
  {
    id: "1",
    url: "https://pitchfork.com/features/interview-demo",
    title: "The Making of 'Midnight Sessions': An Exclusive Interview",
    snippet: "In this 2023 interview, the artist confirms they used a vintage Juno-106 synthesizer for the iconic bass line on track 3, recorded in a single take at 3am.",
    type: "interview",
    status: "pending",
    discoveredAt: "2024-01-15",
  },
  {
    id: "2",
    url: "https://genius.com/annotations/demo",
    title: "Behind the Lyrics: Fan Theory Confirmed",
    snippet: "The artist revealed on a podcast that the recurring 'blue door' metaphor across their discography references their childhood home in Portland.",
    type: "lore",
    status: "pending",
    discoveredAt: "2024-01-14",
  },
  {
    id: "3",
    url: "https://billboard.com/articles/review-demo",
    title: "Album Review: 'Electric Dreams' Marks a New Era",
    snippet: "Critics note this is the first album where the artist handled all production themselves, a departure from their collaborative previous work.",
    type: "review",
    status: "pending",
    discoveredAt: "2024-01-12",
  },
  {
    id: "4",
    url: "https://twitter.com/artist/status/demo",
    title: "Twitter Thread: Studio Setup Tour",
    snippet: "A detailed breakdown of the home studio setup, including the custom-modified microphone preamp built by their engineer father.",
    type: "lore",
    status: "pending",
    discoveredAt: "2024-01-10",
  },
  {
    id: "5",
    url: "https://npr.org/music/tiny-desk-demo",
    title: "NPR Tiny Desk Concert: Behind the Scenes",
    snippet: "The acoustic arrangement of 'Starlight' was created specifically for this performance, featuring a cello part written the night before.",
    type: "article",
    status: "pending",
    discoveredAt: "2024-01-08",
  },
];

const TYPE_BADGES: Record<VaultSource["type"], string> = {
  interview: "badge-interview",
  review: "badge-review",
  lore: "badge-lore",
  article: "badge-pending",
};

export default function PrototypeDashboard() {
  const [sources, setSources] = useState<VaultSource[]>(INITIAL_MOCK_SOURCES);
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending");

  const pendingSources = sources.filter((s) => s.status === "pending");
  const approvedSources = sources.filter((s) => s.status === "approved");

  const handleApprove = (id: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "approved" } : s))
    );
  };

  const handleReject = (id: string) => {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "rejected" } : s))
    );
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-white/40 mb-4">
            <Link href="/" className="hover:text-white transition-colors">
              RECXRD
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span>Artist Dashboard</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img
                src={MOCK_ARTIST.image}
                alt={MOCK_ARTIST.name}
                className="w-16 h-16 rounded-full object-cover border border-white/10"
              />
              <div>
                <h1 className="text-2xl font-bold text-white">{MOCK_ARTIST.name}</h1>
                <p className="text-white/40">Prototype Dashboard</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-2xl font-bold text-white">{pendingSources.length}</div>
                <div className="text-xs text-white/40">Pending Review</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-right">
                <div className="text-2xl font-bold text-emerald-400">{approvedSources.length}</div>
                <div className="text-xs text-white/40">In Vault</div>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("pending")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === "pending" 
                ? "bg-white text-black" 
                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
          >
            <Inbox className="w-4 h-4" />
            Pending
            {pendingSources.length > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded text-xs
                ${activeTab === "pending" ? "bg-black/10" : "bg-white/10"}`}>
                {pendingSources.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("approved")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
              ${activeTab === "approved" 
                ? "bg-white text-black" 
                : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            Approved
            {approvedSources.length > 0 && (
              <span className={`ml-1 px-1.5 py-0.5 rounded text-xs
                ${activeTab === "approved" ? "bg-black/10" : "bg-white/10"}`}>
                {approvedSources.length}
              </span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4">
          {activeTab === "pending" && (
            <>
              {pendingSources.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">All caught up!</h3>
                  <p className="text-white/40">
                    No pending sources to review. Check back later for new AI discoveries.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm text-white/40 mb-4">
                    <Sparkles className="w-4 h-4" />
                    <span>AI-discovered sources awaiting your review</span>
                  </div>
                  {pendingSources.map((source, index) => (
                    <SourceCard
                      key={source.id}
                      source={source}
                      onApprove={() => handleApprove(source.id)}
                      onReject={() => handleReject(source.id)}
                      showActions
                      animationDelay={index * 50}
                    />
                  ))}
                </>
              )}
            </>
          )}

          {activeTab === "approved" && (
            <>
              {approvedSources.length === 0 ? (
                <div className="glass-card p-12 text-center">
                  <Inbox className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Your vault is empty</h3>
                  <p className="text-white/40">
                    Approve some sources from the pending queue to build your verified archive.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 text-sm text-white/40 mb-4">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Verified sources in your public vault</span>
                  </div>
                  {approvedSources.map((source, index) => (
                    <SourceCard
                      key={source.id}
                      source={source}
                      showActions={false}
                      animationDelay={index * 50}
                    />
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

interface SourceCardProps {
  source: VaultSource;
  onApprove?: () => void;
  onReject?: () => void;
  showActions: boolean;
  animationDelay?: number;
}

function SourceCard({ source, onApprove, onReject, showActions, animationDelay = 0 }: SourceCardProps) {
  const [isExiting, setIsExiting] = useState(false);

  const handleAction = (action: "approve" | "reject") => {
    setIsExiting(true);
    setTimeout(() => {
      if (action === "approve" && onApprove) onApprove();
      if (action === "reject" && onReject) onReject();
    }, 200);
  };

  return (
    <div
      className={`source-card transition-all duration-200 ${
        isExiting ? "opacity-0 scale-95" : "opacity-100"
      }`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`badge ${TYPE_BADGES[source.type]}`}>
              {source.type}
            </span>
            <span className="text-xs text-white/30 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {source.discoveredAt}
            </span>
          </div>
          <h3 className="font-medium text-white leading-snug mb-1">
            {source.title}
          </h3>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="source-url flex items-center gap-1 w-fit"
          >
            {new URL(source.url).hostname}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Snippet */}
      <div className="bg-white/[0.02] rounded-lg p-3 border border-white/5">
        <p className="text-sm text-white/60 leading-relaxed">
          &ldquo;{source.snippet}&rdquo;
        </p>
      </div>

      {/* Actions */}
      {showActions && (
        <div className="triage-actions">
          <button
            onClick={() => handleAction("approve")}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
                       bg-white text-black font-medium text-sm
                       hover:bg-white/90 transition-colors"
          >
            <Check className="w-4 h-4" />
            Approve to Vault
          </button>
          <button
            onClick={() => handleAction("reject")}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
                       bg-white/5 text-white/60 font-medium text-sm
                       hover:bg-white/10 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
            Reject
          </button>
        </div>
      )}

      {/* Approved badge */}
      {!showActions && source.status === "approved" && (
        <div className="flex items-center gap-2 pt-3 border-t border-border/50">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-sm text-emerald-400">Verified & Public</span>
        </div>
      )}
    </div>
  );
}

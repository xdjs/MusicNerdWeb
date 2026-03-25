"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { AgentWorkSummary, AgentWorkDetails } from "@/server/utils/queries/agentWorkQueries";

const formatDate = (value: string | null | undefined): string => {
  if (!value) return "";
  const hasExplicitTZ = /Z$|[+-]\d{2}(:\d{2})?$/.test(value);
  const dateObj = new Date(hasExplicitTZ ? value : `${value}Z`);
  const datePart = dateObj.toLocaleDateString();
  const timePart = dateObj
    .toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\s([AP]M)$/i, "\u00A0$1");
  return `${datePart} ${timePart}`;
};

function timeAgo(dateStr: string | null | undefined): string {
  if (!dateStr) return "never";
  const hasExplicitTZ = /Z$|[+-]\d{2}(:\d{2})?$/.test(dateStr);
  const ms = Date.now() - new Date(hasExplicitTZ ? dateStr : `${dateStr}Z`).getTime();
  if (ms < 0) return "just now";
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const ACTION_COLORS: Record<string, string> = {
  resolve: "bg-green-500/20 text-green-400",
  exclude: "bg-yellow-500/20 text-yellow-400",
  set: "bg-blue-500/20 text-blue-400",
  delete: "bg-red-500/20 text-red-400",
};

const STATUS_STYLES: Record<string, { dot: string; bg: string; text: string }> = {
  running: { dot: "bg-green-500", bg: "border-green-500/30", text: "text-green-400" },
  idle: { dot: "bg-yellow-500", bg: "border-yellow-500/30", text: "text-yellow-400" },
  error: { dot: "bg-red-500", bg: "border-red-500/30", text: "text-red-400" },
  dead: { dot: "bg-red-500", bg: "border-red-500/30", text: "text-red-400" },
  stopped: { dot: "bg-zinc-500", bg: "border-zinc-500/30", text: "text-zinc-400" },
};

// --- Eager components (above the fold) ---

function WorkerStatusPanel({ workers }: { workers: AgentWorkSummary["workers"] }) {
  const [showInactive, setShowInactive] = useState(false);
  const dayMs = 24 * 60 * 60 * 1000;
  const activeSet = new Set(workers.filter(w => {
    if (w.computedStatus === "running" || w.computedStatus === "idle" || w.computedStatus === "error") return true;
    const age = Date.now() - new Date(w.updatedAt.endsWith("Z") ? w.updatedAt : `${w.updatedAt}Z`).getTime();
    return age < dayMs;
  }));
  const inactive = workers.filter(w => !activeSet.has(w));
  const visibleWorkers = showInactive ? workers : [...activeSet];

  if (workers.length === 0) return null;

  return (
    <div>
      <h3 className="text-lg font-semibold text-[#9b83a0] mb-3">Workers</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {visibleWorkers.map((w) => {
          const s = STATUS_STYLES[w.computedStatus] ?? STATUS_STYLES.stopped;
          return (
            <div key={w.workerId} className={`rounded-md border ${s.bg} bg-card p-3`}>
              <div className="flex items-center gap-2 mb-1">
                <span className={`inline-block w-2 h-2 rounded-full ${s.dot}`} />
                <span className="font-mono text-sm font-medium">{w.workerId}</span>
                <span className={`text-xs font-medium ${s.text}`}>{w.computedStatus}</span>
              </div>
              {w.message && (
                <p className="text-xs text-muted-foreground truncate mb-1">{w.message}</p>
              )}
              <div className="flex gap-3 text-xs text-muted-foreground">
                {w.currentRun != null && <span>Run #{w.currentRun}</span>}
                {w.batchPlatform && <span>{w.batchPlatform}</span>}
                {typeof w.config?.model === "string" && <span>{w.config.model}</span>}
                <span>Heartbeat: {timeAgo(w.updatedAt)}</span>
                <span>Up: {timeAgo(w.startedAt)}</span>
              </div>
            </div>
          );
        })}
      </div>
      {inactive.length > 0 && (
        <button
          className="text-xs text-muted-foreground mt-2 hover:underline"
          onClick={() => setShowInactive(!showInactive)}
        >
          {showInactive ? "Hide" : "Show"} {inactive.length} inactive worker{inactive.length !== 1 ? "s" : ""}
        </button>
      )}
    </div>
  );
}

function ActivityPulseBar({ pulse }: { pulse: AgentWorkSummary["activityPulse"] }) {
  const ago = timeAgo(pulse.lastWriteAt);
  const ms = pulse.lastWriteAt
    ? Date.now() - new Date(pulse.lastWriteAt.endsWith("Z") ? pulse.lastWriteAt : `${pulse.lastWriteAt}Z`).getTime()
    : Infinity;
  const dotColor = ms < 5 * 60 * 1000 ? "bg-green-500" : ms < 30 * 60 * 1000 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-3 rounded-md border bg-card px-4 py-2">
      <span className={`inline-block w-2.5 h-2.5 rounded-full ${dotColor}`} />
      <span className="text-sm">
        Last write: <span className="font-medium">{ago}</span>
      </span>
      <span className="text-sm text-muted-foreground">|</span>
      <span className="text-sm">
        Rate: <span className="font-medium">{pulse.rateLastHour}/hr</span>
      </span>
    </div>
  );
}

function HourlySparkline({ data }: { data: AgentWorkSummary["hourlyActivity"] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map(d => d.resolveCount + d.excludeCount), 1);

  return (
    <div>
      <h3 className="text-lg font-semibold text-[#9b83a0] mb-3">Activity (last 24h)</h3>
      <div className="flex items-end gap-px h-16 rounded-md border bg-card p-2">
        {data.map((d) => {
          const total = d.resolveCount + d.excludeCount;
          const pct = (total / max) * 100;
          const hour = new Date(d.hour.endsWith("Z") ? d.hour : `${d.hour}Z`).toLocaleTimeString(undefined, { hour: "numeric", hour12: true });
          return (
            <div
              key={d.hour}
              className="flex-1 bg-[#9b83a0] rounded-t-sm min-h-[2px] relative group"
              style={{ height: `${Math.max(pct, 3)}%` }}
              title={`${hour}: ${d.resolveCount} resolved, ${d.excludeCount} excluded`}
            />
          );
        })}
      </div>
    </div>
  );
}

function PlatformStatsSection({ stats }: { stats: AgentWorkSummary["stats"] }) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-[#9b83a0] mb-3">
        Platform Coverage ({stats.totalArtistsWithSpotify.toLocaleString()} artists with Spotify)
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {stats.platformStats.map((p) => (
          <div key={p.platform} className="rounded-md border bg-card p-3">
            <div className="text-sm font-medium">{p.platform}</div>
            <div className="text-2xl font-bold">{p.mappedCount.toLocaleString()}</div>
            <div className="mt-1 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-[#9b83a0]"
                style={{ width: `${Math.min(p.percentage, 100)}%` }}
              />
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {p.percentage}%
              {p.todayCount > 0 && <span className="ml-1 text-green-400">+{p.todayCount} today</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Lazy components (loaded on demand) ---

function ActionBadge({ action }: { action: string }) {
  const colorClass = ACTION_COLORS[action] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
      {action}
    </span>
  );
}

function AgentBreakdownSection({ agents }: { agents: AgentWorkDetails["agentBreakdown"]["agents"] }) {
  if (agents.length === 0) {
    return <p className="text-muted-foreground text-sm">No agent activity yet.</p>;
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-[#9b83a0] mb-3">Per-Agent Breakdown</h3>
      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agent</TableHead>
              <TableHead className="text-right">Resolved</TableHead>
              <TableHead className="text-right">Excluded</TableHead>
              <TableHead className="text-right">High</TableHead>
              <TableHead className="text-right">Medium</TableHead>
              <TableHead className="text-right">Low</TableHead>
              <TableHead className="text-right">Wikidata</TableHead>
              <TableHead className="text-right">MusicBrainz</TableHead>
              <TableHead className="text-right">Name Search</TableHead>
              <TableHead className="text-right">Web Search</TableHead>
              <TableHead className="text-right">Last Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {agents.map((agent) => (
              <TableRow key={agent.apiKeyHash}>
                <TableCell className="font-medium">{agent.label ?? agent.apiKeyHash.slice(0, 8) + "..."}</TableCell>
                <TableCell className="text-right">{agent.resolvedCount}</TableCell>
                <TableCell className="text-right">{agent.excludedCount}</TableCell>
                <TableCell className="text-right">{agent.byConfidence.high}</TableCell>
                <TableCell className="text-right">{agent.byConfidence.medium}</TableCell>
                <TableCell className="text-right">{agent.byConfidence.low}</TableCell>
                <TableCell className="text-right">{agent.bySource.wikidata}</TableCell>
                <TableCell className="text-right">{agent.bySource.musicbrainz}</TableCell>
                <TableCell className="text-right">{agent.bySource.name_search}</TableCell>
                <TableCell className="text-right">{agent.bySource.web_search}</TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">{timeAgo(agent.lastActiveAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function AuditLogSection({
  auditLog,
  onPageChange,
}: {
  auditLog: AgentWorkDetails["auditLog"];
  onPageChange: (page: number) => void;
}) {
  const totalPages = Math.ceil(auditLog.total / auditLog.limit);

  return (
    <div>
      <h3 className="text-lg font-semibold text-[#9b83a0] mb-3">
        Recent Audit Log ({auditLog.total.toLocaleString()} entries)
      </h3>
      <div className="rounded-md border bg-card overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Field</TableHead>
              <TableHead>Artist</TableHead>
              <TableHead>{"Old → New"}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditLog.entries.length ? (
              auditLog.entries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="whitespace-nowrap text-xs">{formatDate(entry.createdAt)}</TableCell>
                  <TableCell className="text-sm">{entry.agentLabel ?? "unknown"}</TableCell>
                  <TableCell><ActionBadge action={entry.action} /></TableCell>
                  <TableCell className="text-sm font-mono">{entry.field}</TableCell>
                  <TableCell>
                    <Link href={`/artist/${entry.artistId}`} className="text-sm text-blue-400 hover:underline">
                      {entry.artistName ?? entry.artistId.slice(0, 8)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
                    {entry.oldValue && entry.newValue
                      ? `${entry.oldValue} → ${entry.newValue}`
                      : entry.newValue ?? entry.oldValue ?? "—"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-16 text-center text-muted-foreground">
                  No audit entries.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-3">
          <span className="text-sm text-muted-foreground">
            Page {auditLog.page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={auditLog.page <= 1}
              onClick={() => onPageChange(auditLog.page - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={auditLog.page >= totalPages}
              onClick={() => onPageChange(auditLog.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function ExclusionsSection({ exclusions }: { exclusions: AgentWorkDetails["exclusions"] }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const platforms = Object.entries(exclusions.platforms);

  if (platforms.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-[#9b83a0] mb-3">Exclusions</h3>
        <p className="text-muted-foreground text-sm">No exclusions recorded.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-[#9b83a0] mb-3">Exclusions</h3>
      <div className="space-y-3">
        {platforms.map(([platform, data]) => (
          <div key={platform} className="rounded-md border bg-card">
            <button
              className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-muted/50"
              onClick={() => setExpanded((prev) => ({ ...prev, [platform]: !prev[platform] }))}
            >
              <span className="font-medium">{platform} ({data.total})</span>
              <span className="text-muted-foreground text-sm">{expanded[platform] ? "▲" : "▼"}</span>
            </button>
            {expanded[platform] && (
              <div className="px-4 pb-3 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artist</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Details</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.exclusions.map((exc) => (
                      <TableRow key={exc.id}>
                        <TableCell>
                          <Link href={`/artist/${exc.artistId}`} className="text-sm text-blue-400 hover:underline">
                            {exc.artistName ?? exc.artistId.slice(0, 8)}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-mono">{exc.reason}</span>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[300px] truncate">
                          {exc.details ?? "—"}
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{formatDate(exc.createdAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- Main component ---

export default function AgentWorkSection() {
  const [summary, setSummary] = useState<AgentWorkSummary | null>(null);
  const [details, setDetails] = useState<AgentWorkDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [paginatingAudit, setPaginatingAudit] = useState(false);
  const [error, setError] = useState("");
  const [auditPage, setAuditPage] = useState(1);

  const fetchSummary = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch("/api/admin/agent-work");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Failed to load (${res.status})`);
        return;
      }
      setSummary(await res.json());
    } catch {
      setError("Failed to load agent work data");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDetails = useCallback(async (page = 1) => {
    try {
      if (page === 1) setLoadingDetails(true);
      else setPaginatingAudit(true);
      const res = await fetch(`/api/admin/agent-work?sections=details&auditPage=${page}&auditLimit=50`);
      if (!res.ok) return;
      const data = await res.json();
      setDetails(data);
      setAuditPage(page);
    } catch {
      // Silently fail — stale details are acceptable
    } finally {
      setLoadingDetails(false);
      setPaginatingAudit(false);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    fetchSummary();
    if (details) fetchDetails(auditPage);
  }, [fetchSummary, fetchDetails, details, auditPage]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin h-8 w-8 border-2 border-[#9b83a0] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <Button variant="outline" className="mt-3" onClick={() => fetchSummary()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-8">
      {/* Eager: above the fold */}
      <div className="flex justify-end">
        <Button variant="ghost" size="sm" className="text-muted-foreground" onClick={handleRefresh} disabled={loading || loadingDetails}>
          {(loading || loadingDetails) ? "Refreshing..." : "Refresh"}
        </Button>
      </div>
      <WorkerStatusPanel workers={summary.workers} />
      <ActivityPulseBar pulse={summary.activityPulse} />
      <HourlySparkline data={summary.hourlyActivity} />
      <PlatformStatsSection stats={summary.stats} />

      {/* Lazy: loaded on demand */}
      {!details && !loadingDetails && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={() => fetchDetails()}>
            Show Details
          </Button>
        </div>
      )}

      {loadingDetails && (
        <div className="flex items-center justify-center h-24">
          <div className="animate-spin h-6 w-6 border-2 border-[#9b83a0] border-t-transparent rounded-full" />
        </div>
      )}

      {details && (
        <>
          <AgentBreakdownSection agents={details.agentBreakdown.agents} />
          <div className={paginatingAudit ? "opacity-50 pointer-events-none" : ""}>
            <AuditLogSection auditLog={details.auditLog} onPageChange={(p) => fetchDetails(p)} />
          </div>
          <ExclusionsSection exclusions={details.exclusions} />
        </>
      )}
    </div>
  );
}

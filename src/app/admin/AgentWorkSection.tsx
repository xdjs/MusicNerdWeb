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
import type { AgentWorkData } from "@/server/utils/queries/agentWorkQueries";

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

const ACTION_COLORS: Record<string, string> = {
  resolve: "bg-green-500/20 text-green-400",
  exclude: "bg-yellow-500/20 text-yellow-400",
  set: "bg-blue-500/20 text-blue-400",
  delete: "bg-red-500/20 text-red-400",
};

function ActionBadge({ action }: { action: string }) {
  const colorClass = ACTION_COLORS[action] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
      {action}
    </span>
  );
}

function PlatformStatsSection({ stats }: { stats: AgentWorkData["stats"] }) {
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
            <div className="text-xs text-muted-foreground mt-1">{p.percentage}%</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentBreakdownSection({ agents }: { agents: AgentWorkData["agentBreakdown"]["agents"] }) {
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
  auditLog: AgentWorkData["auditLog"];
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
              <TableHead>Old → New</TableHead>
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

function ExclusionsSection({ exclusions }: { exclusions: AgentWorkData["exclusions"] }) {
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

export default function AgentWorkSection() {
  const [data, setData] = useState<AgentWorkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [paginatingAudit, setPaginatingAudit] = useState(false);
  const [error, setError] = useState("");
  const [auditPage, setAuditPage] = useState(1);

  // Initial fetch — loads all sections
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`/api/admin/agent-work?auditPage=1&auditLimit=50`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error || `Failed to load (${res.status})`);
        return;
      }
      setData(await res.json());
    } catch {
      setError("Failed to load agent work data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Pagination fetch — only updates the audit log section
  const fetchAuditPage = useCallback(async (page: number) => {
    try {
      setPaginatingAudit(true);
      const res = await fetch(`/api/admin/agent-work?auditPage=${page}&auditLimit=50`);
      if (!res.ok) return;
      const result = await res.json();
      setData((prev) => prev ? { ...prev, auditLog: result.auditLog } : result);
    } catch {
      // Silently fail — stale audit page is acceptable
    } finally {
      setPaginatingAudit(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (auditPage > 1) fetchAuditPage(auditPage);
  }, [auditPage, fetchAuditPage]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin h-8 w-8 border-2 border-[#9b83a0] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">{error}</p>
        <Button variant="outline" className="mt-3" onClick={() => fetchAll()}>
          Retry
        </Button>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      <PlatformStatsSection stats={data.stats} />
      <AgentBreakdownSection agents={data.agentBreakdown.agents} />
      <div className={paginatingAudit ? "opacity-50 pointer-events-none" : ""}>
        <AuditLogSection auditLog={data.auditLog} onPageChange={setAuditPage} />
      </div>
      <ExclusionsSection exclusions={data.exclusions} />
    </div>
  );
}

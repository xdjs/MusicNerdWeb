"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface McpKey {
  id: string;
  label: string;
  keyHashPrefix: string;
  createdAt: string;
  revokedAt: string | null;
}

// Helper to format dates in local timezone without seconds
const formatDate = (value: string | null | undefined): string => {
  if (!value) return "";
  const hasExplicitTZ = /Z$|[+-]\d{2}:?\d{2}$/.test(value);
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

export default function McpKeysSection({ initialKeys }: { initialKeys: McpKey[] }) {
  const [keys, setKeys] = useState<McpKey[]>(initialKeys);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isKeyShownOpen, setIsKeyShownOpen] = useState(false);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<McpKey | null>(null);
  const [newLabel, setNewLabel] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function createKey() {
    if (!newLabel.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/mcp-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: newLabel.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to create key");
        return;
      }
      const data = await res.json();
      setGeneratedKey(data.rawKey);
      setIsCreateOpen(false);
      setIsKeyShownOpen(true);
      setNewLabel("");
      // Refresh key list
      await refreshKeys();
    } catch {
      setError("Failed to create key");
    } finally {
      setLoading(false);
    }
  }

  async function revokeKey() {
    if (!revokeTarget) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/mcp-keys/${revokeTarget.id}/revoke`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to revoke key");
        return;
      }
      setIsRevokeOpen(false);
      setRevokeTarget(null);
      await refreshKeys();
    } catch {
      setError("Failed to revoke key");
    } finally {
      setLoading(false);
    }
  }

  async function refreshKeys() {
    try {
      const res = await fetch("/api/admin/mcp-keys");
      if (res.ok) {
        const data = await res.json();
        setKeys(data);
      }
    } catch {
      // silently fail — stale data is acceptable
    }
  }

  async function copyToClipboard() {
    await navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[#9b83a0]">
          MCP API Keys ({keys.length})
        </h2>
        <Button onClick={() => setIsCreateOpen(true)}>Create Key</Button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Label</TableHead>
              <TableHead>Hash Prefix</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Revoked</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.length ? (
              keys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell className="font-medium">{key.label}</TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">
                      {key.keyHashPrefix}...
                    </code>
                  </TableCell>
                  <TableCell>{formatDate(key.createdAt)}</TableCell>
                  <TableCell>
                    {key.revokedAt ? (
                      <span className="text-red-500 font-medium">Revoked</span>
                    ) : (
                      <span className="text-green-500 font-medium">Active</span>
                    )}
                  </TableCell>
                  <TableCell>{formatDate(key.revokedAt)}</TableCell>
                  <TableCell>
                    {!key.revokedAt && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => {
                          setRevokeTarget(key);
                          setIsRevokeOpen(true);
                        }}
                      >
                        Revoke
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No API keys.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Key Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create MCP API Key</DialogTitle>
            <DialogDescription>
              Enter a label to identify this key (e.g., agent name or purpose).
            </DialogDescription>
          </DialogHeader>
          <Input
            placeholder="Key label"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") createKey();
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createKey} disabled={loading || !newLabel.trim()}>
              {loading ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Key Shown Dialog */}
      <Dialog open={isKeyShownOpen} onOpenChange={(open) => {
        if (!open) {
          setGeneratedKey("");
          setCopied(false);
        }
        setIsKeyShownOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy this key now. It will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-muted p-3 rounded text-sm break-all select-all">
              {generatedKey}
            </code>
            <Button variant="outline" size="sm" onClick={copyToClipboard}>
              {copied ? "Copied!" : "Copy"}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setIsKeyShownOpen(false);
              setGeneratedKey("");
              setCopied(false);
            }}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={isRevokeOpen} onOpenChange={setIsRevokeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to revoke the key &quot;{revokeTarget?.label}&quot;?
              This action is permanent and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRevokeOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={revokeKey} disabled={loading}>
              {loading ? "Revoking..." : "Revoke"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { requestVaultUpload } from "@/lib/source/requestVaultUpload";
import { MAX_VAULT_FILE_BYTES } from "@/lib/vaultUpload";

/** Append-only contributor UI. API verifies trust; this grants no artist editing controls. */
export default function TrustedLoreUpload({ artistId }: { artistId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const tickets = useRef(new Map<string, string>());
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  async function upload(file: File) {
    if (running.current) return;
    if (file.size > MAX_VAULT_FILE_BYTES) {
      toast({
        title: "File too large",
        description: "Choose a file of 10 MB or less.",
        variant: "destructive",
      });
      return;
    }
    running.current = true;
    setBusy(true);
    const key = JSON.stringify([
      artistId,
      file.name,
      file.size,
      file.type,
      file.lastModified,
    ]);
    try {
      let ticket = tickets.current.get(key);
      if (!ticket) {
        const signing = await requestVaultUpload("sign", {
          artistId,
          name: file.name,
          type: file.type,
          size: file.size,
        });
        const signed = await signing.json();
        if (!signing.ok)
          throw new Error(signed.error ?? "Could not prepare upload");
        const data = new FormData();
        data.append("cacheControl", "3600");
        data.append(
          "",
          new Blob([file], { type: signed.contentType }),
          file.name,
        );
        const stored = await fetch(signed.signedUrl, {
          method: "PUT",
          body: data,
        });
        if (!stored.ok)
          throw new Error("Could not store the file. Please retry.");
        ticket = signed.ticket;
        tickets.current.set(key, signed.ticket);
      }
      if (!ticket) throw new Error("Upload ticket is unavailable. Please retry.");
      const completion = await requestVaultUpload("complete", { ticket });
      const result = await completion.json();
      if (!completion.ok) {
        if ([400, 403, 410].includes(completion.status))
          tickets.current.delete(key);
        throw new Error(
          result.error ??
            "Could not confirm the contribution. Retry the same file.",
        );
      }
      tickets.current.delete(key);
      toast({ title: "Lore file saved", description: result.warning });
      router.refresh();
    } catch (error) {
      toast({
        title: "Upload needs attention",
        description:
          error instanceof Error
            ? error.message
            : "Please retry the same file.",
        variant: "destructive",
      });
    } finally {
      running.current = false;
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }
  return (
    <>
      <input
        ref={input}
        type="file"
        aria-label="Choose a Lore file"
        className="hidden"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />
      <Button
        type="button"
        disabled={busy}
        onClick={() => input.current?.click()}
      >
        {busy ? "Uploading…" : "Upload a Lore file"}
      </Button>
    </>
  );
}

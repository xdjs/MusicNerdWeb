"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { disconnectConnection } from "@/lib/oauth/disconnectConnection";
import { formatShortDate } from "@/lib/oauth/formatShortDate";
import { lastUsedLabel } from "@/lib/oauth/lastUsedLabel";
import type { OAuthConnection } from "@/lib/oauth/types";
import AgentTile from "../AgentTile";
import { CHIP, DIVIDER, MUTED_TEXT, SCOPE_LABELS } from "../const";

/**
 * One connected agent: when it connected and was last used, what it can do,
 * and Disconnect, which asks once inline before it stops the agent.
 */
export default function ConnectedAgent({ connection }: { connection: OAuthConnection }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [confirming, setConfirming] = useState(false);
  const { mutate, isPending } = useMutation({
    mutationFn: () => disconnectConnection(connection.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["oauthConnections"] }),
    onError: error => toast({ title: `Could not disconnect ${connection.agent}`, description: error.message, variant: "destructive" }),
  });

  return (
    <li className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 border-b p-4 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-x-4 sm:gap-y-1.5 sm:px-6 sm:py-5 ${DIVIDER} ${confirming ? "bg-highlightpink/[0.06]" : ""}`}>
      <AgentTile className="h-11 w-11 rounded-xl sm:row-span-2 sm:h-12 sm:w-12" />
      <div className="min-w-0 sm:self-end">
        <p className="flex items-center gap-2 text-base font-semibold text-foreground">
          <span className="break-words">{connection.agent}</span>
          <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${connection.lastUsedAt ? "bg-[#059669] dark:bg-jellygreen" : "bg-[#c6bfc7] dark:bg-white/30"}`} />
        </p>
        <p className={`text-[13px] ${MUTED_TEXT}`}>{`Connected ${formatShortDate(connection.connectedAt)} · ${lastUsedLabel(connection.lastUsedAt)}`}</p>
      </div>
      {confirming ? (
        <div className="col-span-2 flex flex-col gap-3 sm:col-span-3">
          <p className="text-sm leading-normal text-foreground">{`Disconnect ${connection.agent}? It stops working at once. You can connect it again any time.`}</p>
          <div className="flex gap-2 sm:justify-end">
            <Button variant="glass" className="min-h-11 flex-1 rounded-md font-semibold sm:flex-none sm:px-6" disabled={isPending} onClick={() => setConfirming(false)}>Keep</Button>
            <Button variant="pink" className="min-h-11 flex-1 rounded-md font-bold sm:flex-none sm:px-6" disabled={isPending} aria-label={`Confirm disconnect ${connection.agent}`} onClick={() => mutate()}>
              Disconnect
            </Button>
          </div>
        </div>
      ) : (
        <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 sm:contents">
          <div className="flex flex-wrap gap-1.5 sm:col-start-2 sm:self-start">
            {connection.scopes.map(scope => <span key={scope} className={CHIP}>{SCOPE_LABELS[scope] ?? scope}</span>)}
          </div>
          <Button variant="glass" className="min-h-11 rounded-full bg-white/70 px-[18px] font-semibold sm:col-start-3 sm:row-span-2 sm:row-start-1 dark:bg-transparent" aria-label={`Disconnect ${connection.agent}`} onClick={() => setConfirming(true)}>
            Disconnect
          </Button>
        </div>
      )}
    </li>
  );
}

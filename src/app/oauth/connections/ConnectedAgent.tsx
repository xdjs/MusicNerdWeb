"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { formatClaimDate } from "@/lib/claims/formatClaimDate";
import { disconnectConnection } from "@/lib/oauth/disconnectConnection";
import type { OAuthConnection } from "@/lib/oauth/types";

/** One connected agent, with when it connected and was last used, and a Disconnect button. */
export default function ConnectedAgent({ connection }: { connection: OAuthConnection }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { mutate, isPending } = useMutation({
    mutationFn: () => disconnectConnection(connection.id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["oauthConnections"] }),
    onError: error => toast({ title: `Could not disconnect ${connection.agent}`, description: error.message, variant: "destructive" }),
  });

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
      <div className="min-w-0 space-y-1">
        <p className="break-words font-semibold">{connection.agent}</p>
        <p className="text-sm text-muted-foreground">{`Connected ${formatClaimDate(connection.connectedAt)}`}</p>
        <p className="text-sm text-muted-foreground">
          {connection.lastUsedAt ? `Last used ${formatClaimDate(connection.lastUsedAt)}` : "Not used yet"}
        </p>
      </div>
      <Button variant="outline" disabled={isPending} aria-label={`Disconnect ${connection.agent}`} onClick={() => mutate()}>
        Disconnect
      </Button>
    </li>
  );
}

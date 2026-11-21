"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { decideConsent } from "@/lib/oauth/decideConsent";
import type { ConsentDecision, ConsentRequest } from "@/lib/oauth/types";

/**
 * Names the agent asking to connect and what it gets, and sends the member's
 * Approve or Deny to MusicNerdAPI. The browser goes only where the API says.
 */
export default function ConsentPrompt({ query, request }: { query: string; request: ConsentRequest }) {
  const router = useRouter();
  const { toast } = useToast();
  const [sending, setSending] = useState(false);

  async function decide(decision: ConsentDecision) {
    setSending(true);
    try {
      router.replace(await decideConsent(query, decision));
    } catch (error) {
      toast({ title: "Could not connect the agent", description: (error as Error).message, variant: "destructive" });
      setSending(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 md:px-8 text-foreground">
      <Card>
        <CardHeader>
          <CardTitle className="break-words">{request.agent} wants to connect to Music Nerd</CardTitle>
          <CardDescription>The agent chose its own name. Approve only if you just asked it to connect.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="list-disc space-y-2 pl-5 text-sm">
            <li>It can use Music Nerd&apos;s tools as you, until you disconnect it.</li>
            <li>
              You&apos;ll go back to <span className="break-all font-mono">{request.redirectHost}</span>.
            </li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button variant="pink" disabled={sending} onClick={() => decide("approve")}>Approve</Button>
            <Button variant="outline" disabled={sending} onClick={() => decide("deny")}>Deny</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { usePrivy } from "@privy-io/react-auth";
import { Clock, MessageSquare, Music, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useMusicNerdUser } from "@/hooks/useMusicNerdUser";
import { decideConsent } from "@/lib/oauth/decideConsent";
import { memberIdentity } from "@/lib/oauth/memberIdentity";
import type { ConsentDecision, ConsentRequest } from "@/lib/oauth/types";
import { DIVIDER, INSET, LINK, MUTED_TEXT, PANEL } from "../const";
import LegalLinks from "../LegalLinks";
import AccountCard from "./AccountCard";
import ConnectHeader from "./ConnectHeader";
import Permission from "./Permission";

/**
 * Names the agent asking to connect, who is signed in and what the agent gets,
 * and sends the member's Approve or Deny to MusicNerdAPI. The browser goes only
 * where the API says.
 */
export default function ConsentPrompt({ query, request }: { query: string; request: ConsentRequest }) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useMusicNerdUser();
  const { user: privyUser } = usePrivy();
  const member = memberIdentity(user, privyUser?.email?.address);
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
    <section aria-labelledby="consent-title" className="mx-auto flex w-full max-w-[492px] flex-col gap-5 px-4 pb-10 pt-2">
      <ConnectHeader agent={request.agent} />
      <div className={`${PANEL} overflow-hidden`}>
        <AccountCard member={member} />
        <div className="flex flex-col gap-3.5 px-5 pb-4 pt-1">
          <p className={`text-sm ${MUTED_TEXT}`}>It will act as you and can:</p>
          <Permission icon={Music} title="Read Music Nerd" text="Look up artists, their links and recent activity." />
          <Permission
            icon={MessageSquare}
            title="Post on the team board"
            badge="Team only"
            text={`Read channels and threads, post and reply as ${request.agent} for ${member.name}.`}
          />
          <p className={`flex items-center gap-2 border-t pt-3.5 text-[13px] ${DIVIDER} ${MUTED_TEXT}`}>
            <Clock aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            <span>Until you disconnect it · <Link href="/oauth/connections" className={LINK}>Connected agents</Link></span>
          </p>
          <details className={`text-[13px] ${MUTED_TEXT}`}>
            <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
              <Shield aria-hidden="true" className="h-4 w-4 shrink-0" strokeWidth={1.8} />
              The agent chose its own name
            </summary>
            <p className={`rounded-[10px] p-3 leading-normal ${INSET}`}>
              Approve only if you just asked it to connect. After you approve, you go back to{" "}
              <strong className="break-all text-foreground">{request.redirectHost}</strong>.
            </p>
          </details>
        </div>
      </div>
      <div className="flex gap-3">
        <Button variant="glass" className="min-h-12 flex-1 rounded-md text-[15px] font-semibold" disabled={sending} onClick={() => decide("deny")}>Deny</Button>
        <Button variant="pink" className="min-h-12 flex-[2] rounded-md text-[15px] font-bold" disabled={sending} onClick={() => decide("approve")}>Approve</Button>
      </div>
      <LegalLinks />
    </section>
  );
}

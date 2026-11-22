"use client";

import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import Message from "@/app/access/Message";
import { useMusicNerdUser } from "@/hooks/useMusicNerdUser";
import { musicNerdApiUrl } from "@/lib/musicNerdApi/musicNerdApiUrl";
import { fetchConnections } from "@/lib/oauth/fetchConnections";
import { memberIdentity } from "@/lib/oauth/memberIdentity";
import { ACCENT, HEADLINE, MUTED_TEXT, PANEL } from "../const";
import SignInCard from "../SignInCard";
import ConnectedAgent from "./ConnectedAgent";

/** The agents the signed-in member has connected to the Music Nerd MCP server. */
export default function ConnectedAgents() {
  const { ready, authenticated, user: privyUser } = usePrivy();
  const { user } = useMusicNerdUser();
  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["oauthConnections"],
    queryFn: fetchConnections,
    enabled: ready && authenticated,
  });

  if (!ready) return <Message><p className={MUTED_TEXT}>Loading…</p></Message>;
  const member = memberIdentity(user, privyUser?.email?.address);

  return (
    <section aria-labelledby="connections-title" className="mx-auto flex w-full max-w-[720px] flex-col gap-6 px-4 pb-10 pt-2 sm:pt-4">
      <div className="flex items-start justify-between gap-4 sm:items-end">
        <div className="min-w-0">
          <h1 id="connections-title" className={`text-[36px] leading-[1.05] sm:text-[44px] ${HEADLINE}`}>
            Connected <span className={ACCENT}>agents</span>
          </h1>
          <p className={`mt-2 text-sm leading-normal sm:mt-2.5 sm:text-[15px] ${MUTED_TEXT}`}>
            Agents you&apos;ve let use Music Nerd as you. Disconnecting one stops it at once.
          </p>
        </div>
        {authenticated && (
          <div className={`flex shrink-0 items-center gap-2 text-[13px] ${MUTED_TEXT}`}>
            {member.email && <span className="hidden sm:inline">{member.email}</span>}
            <Button variant="glass" size="icon" className="h-11 w-11 rounded-md" aria-label="Refresh" disabled={isFetching} onClick={() => refetch()}>
              <RefreshCw aria-hidden="true" className={`h-[18px] w-[18px] ${isFetching ? "animate-spin" : ""}`} strokeWidth={1.8} />
            </Button>
          </div>
        )}
      </div>
      {!authenticated ? (
        <SignInCard text="Log in with your Music Nerd email to see your connected agents." />
      ) : (
        <div className={`${PANEL} overflow-hidden`}>
          {isLoading ? (
            <p className={`px-6 py-10 text-center ${MUTED_TEXT}`}>Loading connected agents…</p>
          ) : isError ? (
            <div className="px-6 py-10 text-center">
              <p className={`mb-4 ${MUTED_TEXT}`}>Could not load your connected agents.</p>
              <Button variant="pink" className="rounded-md" onClick={() => refetch()}>Try again</Button>
            </div>
          ) : data?.length ? (
            <ul>
              {data.map(connection => <ConnectedAgent key={connection.id} connection={connection} />)}
            </ul>
          ) : (
            <p className={`px-6 py-10 text-center ${MUTED_TEXT}`}>No agents connected yet.</p>
          )}
        </div>
      )}
      <p className={`text-[13px] leading-normal ${MUTED_TEXT}`}>
        To connect another agent, add <strong className="break-all text-foreground">{musicNerdApiUrl("/mcp")}</strong> as a connector and sign in here.
      </p>
    </section>
  );
}

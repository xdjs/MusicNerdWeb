"use client";

import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PleaseLoginPage from "@/app/_components/PleaseLoginPage";
import Message from "@/app/access/Message";
import { fetchConnections } from "@/lib/oauth/fetchConnections";
import ConnectedAgent from "./ConnectedAgent";

/** The agents the signed-in member has connected to the Music Nerd MCP server. */
export default function ConnectedAgents() {
  const { ready, authenticated } = usePrivy();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["oauthConnections"],
    queryFn: fetchConnections,
    enabled: ready && authenticated,
  });

  if (!ready) return <Message><p className="text-muted-foreground">Loading…</p></Message>;
  if (!authenticated) return <Message><PleaseLoginPage text="Log in to see your connected agents" /></Message>;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 text-foreground">
      <Card>
        <CardHeader>
          <CardTitle>Connected agents</CardTitle>
          <CardDescription>Agents you&apos;ve let use Music Nerd&apos;s tools. Disconnecting one stops it at once.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Loading connected agents…</p>
          ) : isError ? (
            <div className="py-8 text-center">
              <p className="mb-4 text-muted-foreground">Could not load your connected agents.</p>
              <Button onClick={() => refetch()}>Try again</Button>
            </div>
          ) : data?.length ? (
            <ul className="divide-y">
              {data.map(connection => <ConnectedAgent key={connection.id} connection={connection} />)}
            </ul>
          ) : (
            <p className="py-8 text-center text-muted-foreground">No agents connected yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

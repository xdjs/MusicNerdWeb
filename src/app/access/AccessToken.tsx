"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

/**
 * The signed-in user's Privy access token, to call the Music Nerd API with
 * `Authorization: Bearer`. Mirrors Recoup's /access page; the docs'
 * Authentication page sends API callers here.
 */
export default function AccessToken() {
  const { getAccessToken, ready, authenticated } = usePrivy();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: accessToken, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["accessToken"],
    queryFn: async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("Failed to get access token");
      return token;
    },
    enabled: ready && authenticated,
  });

  useEffect(() => {
    if (isError) {
      toast({ title: "Could not get your access token", variant: "destructive" });
      console.error(error);
    }
  }, [isError, error, toast]);

  useEffect(() => setCopied(false), [accessToken]);

  async function copy() {
    if (!accessToken) return;
    await navigator.clipboard.writeText(accessToken);
    setCopied(true);
  }

  if (!ready) return <Message>Loading…</Message>;
  if (!authenticated) return <Message>Log in to see your access token.</Message>;

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 text-foreground">
      <Card>
        <CardHeader>
          <CardTitle>Access token</CardTitle>
          <CardDescription>Your Privy Bearer token for the Music Nerd API. It expires after about an hour.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <p className="py-8 text-center text-muted-foreground">Loading access token…</p>
          ) : accessToken ? (
            <>
              <pre className="rounded-lg border bg-muted p-4 font-mono text-sm break-all whitespace-pre-wrap">{accessToken}</pre>
              <div className="flex flex-wrap gap-2">
                <Button onClick={copy}>{copied ? "Copied" : "Copy token"}</Button>
                <Button variant="outline" onClick={() => refetch()}>Refresh token</Button>
              </div>
            </>
          ) : (
            <div className="py-8 text-center">
              <p className="mb-4 text-muted-foreground">Could not get your access token.</p>
              <Button onClick={() => refetch()}>Try again</Button>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-[50vh] items-center justify-center px-4">
      <p className="text-muted-foreground">{children}</p>
    </main>
  );
}

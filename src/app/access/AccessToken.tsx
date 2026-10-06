"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PleaseLoginPage from "@/app/_components/PleaseLoginPage";
import { useAccessToken } from "@/hooks/useAccessToken";
import { useCopy } from "@/hooks/useCopy";

/**
 * The signed-in user's access token, to call the Music Nerd API with
 * `Authorization: Bearer`. Mirrors Recoup's /access page; the docs'
 * Authentication page sends API callers here.
 */
export default function AccessToken() {
  const { accessToken, isLoading, refetch, ready, authenticated } = useAccessToken();
  const { copied, copy } = useCopy(accessToken);

  if (!ready) return <Message>Loading…</Message>;
  if (!authenticated) return <PleaseLoginPage text="Log in to see your access token" />;

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 md:px-8 text-foreground">
      <Card>
        <CardHeader>
          <CardTitle>Access token</CardTitle>
          <CardDescription>Your Bearer token for the Music Nerd API. It expires after about an hour.</CardDescription>
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
    </div>
  );
}

function Message({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center px-4">
      <p className="text-muted-foreground">{children}</p>
    </div>
  );
}

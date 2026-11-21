"use client";

import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useSearchParams } from "next/navigation";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PleaseLoginPage from "@/app/_components/PleaseLoginPage";
import Message from "@/app/access/Message";
import { fetchConsentRequest } from "@/lib/oauth/fetchConsentRequest";
import ConsentPrompt from "./ConsentPrompt";

/**
 * An agent's authorization request: signs the member in, asks MusicNerdAPI
 * whether the request is valid and which agent sent it, then asks the member.
 */
export default function ConsentRequest() {
  const query = useSearchParams().toString();
  const { ready, authenticated } = usePrivy();
  const { data, error, isLoading } = useQuery({
    queryKey: ["oauthConsent", query],
    queryFn: () => fetchConsentRequest(query),
    enabled: ready && authenticated,
  });

  if (!ready) return <Message><p className="text-muted-foreground">Loading…</p></Message>;
  if (!authenticated) return <Message><PleaseLoginPage text="Log in to connect your agent" /></Message>;
  if (isLoading) return <Message><p className="text-muted-foreground">Checking the request…</p></Message>;
  if (data) return <ConsentPrompt query={query} request={data} />;

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-6 md:px-8 text-foreground">
      <Card>
        <CardHeader>
          <CardTitle>This connection request can&apos;t be used</CardTitle>
          <CardDescription>{error?.message}</CardDescription>
          <p className="text-sm text-muted-foreground">Go back to your agent and connect again.</p>
        </CardHeader>
      </Card>
    </div>
  );
}

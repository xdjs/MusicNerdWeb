"use client";

import { useQuery } from "@tanstack/react-query";
import { usePrivy } from "@privy-io/react-auth";
import { useSearchParams } from "next/navigation";
import Message from "@/app/access/Message";
import { fetchConsentRequest } from "@/lib/oauth/fetchConsentRequest";
import { MUTED_TEXT, PANEL } from "../const";
import LegalLinks from "../LegalLinks";
import SignInCard from "../SignInCard";
import ConnectHeader from "./ConnectHeader";
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

  if (!ready) return <Message><p className={MUTED_TEXT}>Loading…</p></Message>;
  if (!authenticated) {
    return (
      <section aria-labelledby="consent-title" className="mx-auto flex w-full max-w-[460px] flex-1 flex-col gap-5 px-4 pb-8 pt-2">
        <div className="flex flex-1 flex-col justify-center gap-5">
          <ConnectHeader agent="An agent" />
          <SignInCard text="Log in with your Music Nerd email to see which agent is asking and what for." note="Nothing is shared until you approve." />
        </div>
        <LegalLinks />
      </section>
    );
  }
  if (isLoading) return <Message><p className={MUTED_TEXT}>Checking the request…</p></Message>;
  if (data) return <ConsentPrompt query={query} request={data} />;

  return (
    <section className="mx-auto flex w-full max-w-[460px] flex-col gap-5 px-4 pb-10 pt-8">
      <div className={`${PANEL} flex flex-col gap-2 p-5`}>
        <h1 className="text-xl font-bold tracking-[-0.02em] text-foreground">This connection request can&apos;t be used</h1>
        <p className={`text-sm ${MUTED_TEXT}`}>{error?.message}</p>
        <p className={`text-sm ${MUTED_TEXT}`}>Go back to your agent and connect again.</p>
      </div>
      <LegalLinks />
    </section>
  );
}

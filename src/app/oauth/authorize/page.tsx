import type { Metadata } from "next";
import { Suspense } from "react";
import ConsentRequest from "./ConsentRequest";

export const metadata: Metadata = {
  title: "Connect an agent",
  robots: { index: false, follow: false },
};

/** Where an agent sends a member to approve its connection to the Music Nerd MCP server. */
export default function Page() {
  return (
    <Suspense>
      <ConsentRequest />
    </Suspense>
  );
}

import type { Metadata } from "next";
import ConnectedAgents from "./ConnectedAgents";

export const metadata: Metadata = {
  title: "Connected agents",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <ConnectedAgents />;
}

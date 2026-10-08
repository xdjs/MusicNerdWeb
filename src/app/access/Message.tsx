import type { ReactNode } from "react";

/** Centres the /access page's loading and sign-in states between header and footer. */
export default function Message({ children }: { children: ReactNode }) {
  return <div className="flex flex-1 items-center justify-center px-4">{children}</div>;
}

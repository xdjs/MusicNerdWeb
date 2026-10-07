import type { Metadata } from "next";
import AccessToken from "./AccessToken";

export const metadata: Metadata = {
  title: "Access token",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <AccessToken />;
}

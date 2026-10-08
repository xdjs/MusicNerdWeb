import type { Metadata } from "next";
import PrivacyPolicy from "./PrivacyPolicy";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What Music Nerd collects, why, who processes it and how to ask us to delete it.",
};

export default function Page() {
  return <PrivacyPolicy />;
}

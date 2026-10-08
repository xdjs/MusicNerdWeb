import type { Metadata } from "next";
import TermsOfService from "./TermsOfService";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using Music Nerd, its artist profiles and its API.",
};

export default function Page() {
  return <TermsOfService />;
}

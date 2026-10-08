import Link from "next/link";
import LegalPage from "@/app/_components/legal/LegalPage";
import { LEGAL_CONTACT_EMAIL, LEGAL_OPERATOR } from "@/lib/legal/constants";

/** The Terms of Service copy shown at /terms. */
export default function TermsOfService() {
  return (
    <LegalPage title="Terms of Service">
      <p>
        Music Nerd is an artist directory run by {LEGAL_OPERATOR} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). These terms
        apply to musicnerd.net, its artist profiles and the Music Nerd API. By using Music Nerd you agree to
        them. Our <Link href="/privacy">Privacy Policy</Link> explains what we collect and why.
      </p>

      <h2>Your account</h2>
      <p>
        You can browse Music Nerd without an account. To contribute, claim an artist profile or use the API you
        sign in with your email address. You must be at least 13 years old to create an account. Keep your sign-in
        to yourself; you are responsible for what is done with your account.
      </p>

      <h2>What you contribute</h2>
      <p>
        Links, Lore, sources, edits and interview answers you add stay yours. By adding them you give us a
        worldwide, royalty-free, non-exclusive licence to store, display, adapt and share them as part of Music
        Nerd and its API, credited to your username. Only add what is accurate and what you have the right to
        share. We review contributions and may edit, decline or remove any of them.
      </p>

      <h2>Artist profiles and claims</h2>
      <p>
        Claim an artist profile only if you are that artist or are authorised to act for them. We may ask you to
        prove it, and we may refuse or revoke a claim.
      </p>

      <h2>Information on Music Nerd</h2>
      <p>
        Profiles are compiled from public sources, contributions and AI-written summaries of those sources. They
        can be incomplete or wrong. Music Nerd is not affiliated with the artists it lists unless a profile says it
        has been claimed, and artist names, images and marks belong to their owners. If something is wrong, tell
        us and we will look at it.
      </p>

      <h2>The API</h2>
      <p>
        Your API access token is tied to your account; do not share it. Do not use the API or the site to
        harvest data in bulk beyond what the API documentation describes. We may limit or revoke access to keep
        the service working for everyone.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>No unlawful, infringing, hateful or harassing content.</li>
        <li>No impersonating an artist or another person.</li>
        <li>No spam, and no submitting links to malware or deceptive sites.</li>
        <li>No attempts to break, overload or get around the security of Music Nerd.</li>
      </ul>
      <p>We may suspend or close accounts that break these terms.</p>

      <h2>No warranty</h2>
      <p>
        Music Nerd is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any kind.
        To the extent the law allows, {LEGAL_OPERATOR} is not liable for indirect or consequential losses arising
        from your use of Music Nerd.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms. The effective date at the top of this page changes when we do, and continuing
        to use Music Nerd after that means you accept the new terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}

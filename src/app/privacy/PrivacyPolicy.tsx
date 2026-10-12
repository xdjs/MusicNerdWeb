import Link from "next/link";
import LegalPage from "@/app/_components/legal/LegalPage";
import { LEGAL_CONTACT_EMAIL, LEGAL_OPERATOR } from "@/lib/legal/constants";

/** The Privacy Policy copy shown at /privacy. */
export default function PrivacyPolicy() {
  const contact = <a href={`mailto:${LEGAL_CONTACT_EMAIL}`}>{LEGAL_CONTACT_EMAIL}</a>;
  return (
    <LegalPage title="Privacy Policy">
      <p>
        Music Nerd is run by {LEGAL_OPERATOR} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). This policy explains what we
        collect when you use musicnerd.net and the Music Nerd API, why, and what you can ask us to do with it. Our{" "}
        <Link href="/terms">Terms of Service</Link> cover the rules for using the site.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account.</strong> When you sign in: your email address, the username you choose or we
          suggest, your sign-in provider&rsquo;s user id, and a wallet address if you linked one.
        </li>
        <li>
          <strong>What you contribute.</strong> Links, Lore, sources, edits, artist claims, interview answers and
          bookmarks. Contributions other than bookmarks are shown publicly with your username.
        </li>
        <li>
          <strong>How the site is used.</strong> We use Vercel Web Analytics, which does not use cookies. It
          records the page address, referrer, country, device type, browser and operating system, with a visitor
          id derived from a daily hash that is not linked to your account. We also record events such as a
          submitted link or an opened dialog.
        </li>
        <li>
          <strong>Server logs.</strong> Our hosting provider keeps request logs, including IP addresses, for
          security and debugging.
        </li>
      </ul>

      <h2>Artist information</h2>
      <p>
        Artist profiles are built from public sources: websites, streaming catalogues, press and public social
        media posts, plus what contributors and the artists themselves add. We use AI models to summarise and
        cite these sources. If you are an artist and want something corrected or removed, contact us at {contact}.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To run your account, credit your contributions and show the leaderboard.</li>
        <li>To review contributions and artist claims, and to email you about them.</li>
        <li>To understand which pages and features are used, and to keep the service secure.</li>
      </ul>
      <p>We do not sell your personal information and we do not show ads.</p>

      <h2>Who processes it</h2>
      <p>We rely on these providers, each only for its part:</p>
      <ul>
        <li>Vercel: hosting, analytics and routing requests to AI models.</li>
        <li>Supabase: our database.</li>
        <li>Privy: email sign-in.</li>
        <li>Resend: account and claim emails.</li>
        <li>Discord: notifying our team when something needs review.</li>
        <li>
          AI model providers, Tavily, Apify, Spotify and Deezer: researching and summarising public artist
          information. They receive artist data and sources, not your account details.
        </li>
      </ul>
      <p>We may also disclose information when the law requires it.</p>

      <h2>Cookies and browser storage</h2>
      <p>
        We use a session cookie and our sign-in provider&rsquo;s storage to keep you signed in, and your
        browser&rsquo;s storage to remember your light or dark theme and a few display preferences. We do not use
        advertising or cross-site tracking cookies.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep account data while your account exists. If you ask us to delete your account we delete your
        email address and sign-in details; your public contributions are either removed or kept without your
        username, whichever you prefer.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask us for a copy of your data, to correct it or to delete it by emailing {contact}. We will
        reply within 30 days.
      </p>

      <h2>Children</h2>
      <p>Music Nerd is not meant for children under 13, and we do not knowingly collect their information.</p>

      <h2>Changes</h2>
      <p>We will update the effective date at the top of this page whenever this policy changes.</p>

      <h2>Contact</h2>
      <p>Privacy questions and requests: {contact}.</p>
    </LegalPage>
  );
}

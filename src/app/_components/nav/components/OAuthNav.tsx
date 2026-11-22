import Image from 'next/image';
import Link from 'next/link';
import Login from './Login';

/**
 * The OAuth pages' slim header: the wordmark and a way back. The login button
 * stays mounted, hidden, so the pages' Log in can open Privy through it.
 */
export default function OAuthNav() {
  return (
    <nav aria-label="Main navigation" className="mx-auto flex w-full max-w-[1280px] items-center justify-between gap-2 px-4 py-5 sm:px-12 sm:py-7">
      <Link href="/" className="flex items-center gap-2.5 text-foreground">
        <Image src="/musicNerdLogo.png" alt="" width={32} height={32} className="h-7 w-7 rounded-full sm:h-8 sm:w-8" priority />
        <span className="text-base font-bold tracking-[-0.03em] sm:text-lg">music nerd</span>
      </Link>
      <Link href="/" className="hidden text-sm text-[#5a4d5e] hover:underline dark:text-[#a0aec0] sm:inline">Back to Music Nerd</Link>
      <div hidden>
        <Login buttonStyles="" />
      </div>
    </nav>
  );
}

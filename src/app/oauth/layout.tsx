import type { ReactNode } from 'react';

/** The OAuth pages sit on a faint maroon tint in light mode, so their white glass panels read. */
export default function OAuthLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 bg-maroon/[0.04] dark:bg-transparent" />
      {children}
    </>
  );
}

import Link from 'next/link';
import { MUTED_TEXT } from './const';

/** Terms and Privacy, under the OAuth pages' actions. */
export default function LegalLinks() {
  return (
    <p className={`text-center text-xs ${MUTED_TEXT}`}>
      <Link href="/terms" className="underline underline-offset-2">Terms</Link>
      {' · '}
      <Link href="/privacy" className="underline underline-offset-2">Privacy</Link>
    </p>
  );
}

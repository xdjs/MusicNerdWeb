import Link from "next/link";

/** The footer's way to the API docs and the Terms and Privacy pages, on every page. */
export default function FooterLinks() {
    return (
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <Link href="/about" className="hover:underline underline-offset-4">About</Link>
            <a href="https://docs.musicnerd.net" target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-4">Docs</a>
            <Link href="/terms" className="hover:underline underline-offset-4">Terms</Link>
            <Link href="/privacy" className="hover:underline underline-offset-4">Privacy</Link>
        </nav>
    );
}

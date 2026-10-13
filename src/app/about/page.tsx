import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import PreviewNavigation from "@/app/preview/about-api/PreviewNavigation";
import styles from "@/app/profile/ProfileConcept.module.css";

export const metadata: Metadata = { title: "About Music Nerd", description: "Discover the music, stories and people behind an artist. Build with Music Nerd’s shared artist directory." };

export default function AboutPage() {
  const preview = process.env.NODE_ENV === 'development' || process.env.VERCEL_ENV === 'preview';
  return <>{preview && <PreviewNavigation about />}<article className={`${styles.concept} mx-auto w-full max-w-6xl px-5 sm:px-10 py-8 sm:py-14 text-foreground`}>
    <div className="max-w-3xl">
      <h1 className="text-4xl sm:text-6xl font-semibold tracking-tight leading-[1.08]">There’s more to an artist<br className="hidden sm:block"/> than a song.</h1>
      <p className="text-lg sm:text-xl text-muted-foreground leading-relaxed mt-6 max-w-2xl">Music Nerd brings an artist’s music, links and stories together. Discover what they’re making, hear how it came together, and help fill in the picture.</p>
      <Link href="/" className="inline-flex items-center justify-center mt-7 button-pink rounded-xl bg-highlightpink text-black font-medium px-6 min-h-12 hover:bg-highlightpink/80">Explore artists</Link>
    </div>
    <div className="grid md:grid-cols-3 gap-8 md:gap-10 mt-14 pt-9 border-t border-border">
      <section><h2 className="text-xl font-semibold">Follow your curiosity</h2><p className="text-muted-foreground leading-relaxed mt-3">Find an artist’s official links and latest updates. Ask about their work and follow the sources behind the answer.</p></section>
      <section><h2 className="text-xl font-semibold">Tell your own story</h2><p className="text-muted-foreground leading-relaxed mt-3">Claim your artist profile, curate your Lore, and add your own words through interviews. Review and correct what’s there.</p></section>
      <section><h2 className="text-xl font-semibold">Help connect the dots</h2><p className="text-muted-foreground leading-relaxed mt-3">Share a missing artist link or suggest a source. Contributions help make the directory more useful for everyone.</p></section>
    </div>
    <section className="mt-12 sm:mt-16 rounded-2xl border border-border bg-white/50 dark:bg-white/[0.03] p-6 sm:p-9 grid md:grid-cols-[1.25fr_1fr] gap-7 items-center" aria-labelledby="build-heading">
      <div><h2 id="build-heading" className="text-2xl sm:text-3xl font-semibold tracking-tight">Make something with it.</h2><p className="text-muted-foreground leading-relaxed mt-3 max-w-xl">Building an app, an agent or a new way to explore music? Use the Music Nerd API to work with artist data and supported research tools.</p></div>
      <div className="md:pl-6"><Link href={preview ? '/preview/about-api?tab=api' : '/access'} className="inline-flex items-center justify-center rounded-xl button-pink bg-highlightpink text-black font-medium px-5 min-h-12 hover:bg-highlightpink/80">{preview ? 'Connect from your profile' : 'Get an access token'}</Link><a href="https://musicnerd-docs.vercel.app" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 mt-4 text-sm underline underline-offset-4">Explore the API docs <ArrowUpRight size={16}/></a>{preview && <p className="text-xs text-muted-foreground mt-3">Preview the proposed API tab with a sample token.</p>}</div>
    </section>
    <section className="mt-12 sm:mt-16 grid md:grid-cols-[1.25fr_1fr] gap-7 border-t border-border pt-8 pb-5"><div><h2 className="text-xl font-semibold">Who’s behind Music Nerd?</h2><p className="text-muted-foreground leading-relaxed mt-3 max-w-xl">Music Nerd is built by a small team of artists, music fans and developers, with contributions from the community. Meet the contributors below or follow the project on GitHub.</p></div><div className="md:pl-6"><h3 className="font-semibold">Keep in touch</h3><a className="inline-flex items-center gap-2 mt-3 text-sm underline underline-offset-4" href="https://github.com/xdjs/MusicNerdWeb" target="_blank" rel="noopener noreferrer">Follow the project on GitHub <ArrowUpRight size={16}/></a><div className="flex gap-5 mt-4 text-sm"><Link href="/terms" className="underline underline-offset-4">Terms</Link><Link href="/privacy" className="underline underline-offset-4">Privacy</Link></div></div></section>
  </article></>;
}

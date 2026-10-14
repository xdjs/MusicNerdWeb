"use client";

import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/app/_components/ThemeProvider";

export default function PreviewNavigation({ about = false }: { about?: boolean }) {
  const { theme, setTheme } = useTheme();
  return <div className="mx-auto w-full max-w-6xl px-5 sm:px-10 py-3 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground border-b border-border">
    <span>{about ? 'Design preview · About Music Nerd' : 'Design preview · Sample account and token'}</span>
    <div className="flex items-center gap-5"><Link href={about ? '/preview/about-api' : '/about'} className="underline underline-offset-4 text-foreground">{about ? 'View profile prototype' : 'View About page'}</Link>
    <button type="button" className="inline-flex items-center gap-2 rounded-lg p-2 text-foreground hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-pink-400" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={17}/> : <Moon size={17}/>}<span className="sr-only">Theme</span></button></div>
  </div>;
}

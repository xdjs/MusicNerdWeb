"use client";

import { useState } from "react";
import { ArrowUpRight, Check, Copy, RefreshCw, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Interaction prototype only. Never obtains or persists real credentials. */
export default function ApiConnectionPreview() {
  const [revision, setRevision] = useState(0);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const token = `demo_musicnerd_token_${revision}_not_a_real_credential`;
  const primary = "button-pink bg-highlightpink text-black hover:bg-highlightpink/80 rounded-xl min-h-11 px-5";
  const secondary = "bg-transparent text-foreground border-border hover:bg-muted hover:text-foreground rounded-xl min-h-11 px-5";

  return <section className="pb-6 max-w-4xl" aria-labelledby="api-heading">
    <div className="flex items-start justify-between gap-5 flex-wrap mb-8">
      <div><h2 id="api-heading" className="text-2xl sm:text-3xl font-semibold tracking-tight">Build with Music Nerd</h2>
      <p className="mt-3 text-muted-foreground max-w-xl leading-relaxed">Connect your app or agent to Music Nerd’s artist data. Use an access token for requests that need your account.</p></div>
      <a href="https://docs.musicnerd.net" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 underline underline-offset-4 text-sm py-2">Explore the API <ArrowUpRight size={16}/></a>
    </div>
    <div className="rounded-2xl border border-border bg-white/50 dark:bg-white/[0.03] p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="text-xl font-semibold">Your access token</h3><span className="text-xs px-3 py-1 rounded-full bg-muted text-muted-foreground">Private to your account</span></div>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-xl">A temporary token that carries your existing account permissions. It expires after about an hour.</p>
      {revision > 0 ? <>
        <label htmlFor="sample-api-token" className="block text-sm font-medium mt-6 mb-2">Sample token</label>
        <textarea id="sample-api-token" readOnly value={token} rows={2} spellCheck={false} className="w-full resize-none rounded-xl border border-border bg-background p-4 text-sm font-mono text-foreground break-all focus:outline-none focus:ring-2 focus:ring-highlightpink" />
        <div className="flex flex-wrap gap-3 mt-4">
          <Button className={primary} onClick={async () => { try { await navigator.clipboard.writeText(token); setCopied(true); setCopyError(false); } catch { setCopyError(true); } }}>{copied ? <Check size={16} className="mr-2"/> : <Copy size={16} className="mr-2"/>}{copied ? 'Copied' : 'Copy token'}</Button>
          <Button variant="outline" className={secondary} onClick={() => { setRevision(value => value + 1); setCopied(false); setCopyError(false); }}><RefreshCw size={16} className="mr-2"/>Refresh token</Button>
        </div>
        <p role="status" className="mt-3 text-sm text-muted-foreground">{copyError ? 'Copy wasn’t available. Select the sample token above to copy it.' : copied ? 'Sample token copied. It cannot authenticate a request.' : revision > 1 ? 'Sample token refreshed. This is not a real credential.' : 'This sample cannot authenticate a request.'}</p>
      </> : <div className="mt-6"><Button className={primary} onClick={() => setRevision(1)}>Get access token</Button><p className="mt-3 text-sm text-muted-foreground">Prototype: this displays a sample token.</p></div>}
      <p className="mt-5 pt-5 border-t border-border text-sm text-muted-foreground">Keep your token private. Only use it in apps and tools you trust.</p>
    </div>
    <div className="grid gap-7 sm:grid-cols-2 mt-8">
      <div><h3 className="font-semibold text-lg">Try your first request</h3><p className="text-sm text-muted-foreground leading-relaxed mt-2">Open an endpoint in the docs and paste your token into the authorization field.</p><a className="inline-flex items-center gap-1 text-sm underline underline-offset-4 mt-3" href="https://docs.musicnerd.net/authentication" target="_blank" rel="noopener noreferrer">Read the connection guide <ArrowUpRight size={15}/></a></div>
      <div><h3 className="font-semibold text-lg flex items-center gap-2"><Terminal size={18}/>In your own app</h3><p className="text-sm text-muted-foreground leading-relaxed mt-2">Send your token in the request header:</p><pre className="mt-3 p-3 rounded-xl bg-muted text-foreground text-xs overflow-x-auto">Authorization: Bearer YOUR_ACCESS_TOKEN</pre></div>
    </div>
  </section>;
}

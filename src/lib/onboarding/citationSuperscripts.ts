/** Wraps each `[n]` citation marker in a `<sup>` so the research view can show it
 *  as a quiet superscript (docs/research-view.md). Markdown links (`[3](…)`),
 *  bracketed prose and a marker still streaming in are left as they are. */
export function citationSuperscripts(text: string): string {
    return text.replace(/\[(\d+)\](?!\()/g, "<sup>[$1]</sup>");
}

/** Wraps each `[n]` citation marker in a `<sup>` so the research view can show it
 *  as a quiet superscript (docs/research-view.md). Markdown links (`[3](…)`) and
 *  bracketed prose are left as they are. A marker still streaming in at the very
 *  end (`[` or `[1`, no closing bracket yet) is dropped until it completes: left
 *  in, Streamdown's incomplete-Markdown repair draws it as a half-typed link. */
export function citationSuperscripts(text: string): string {
    return text
        .replace(/\[\d*$/, "")
        .replace(/\[(\d+)\](?!\()/g, "<sup>[$1]</sup>");
}

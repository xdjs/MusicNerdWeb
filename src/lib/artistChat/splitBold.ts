/** One stretch of answer text: plain, bold or italic. */
export interface TextRun {
    text: string;
    bold: boolean;
    italic?: boolean;
}

/** "**bold**" or "*italic*" / "_italic_", on one line, not starting or ending in a space. */
const EMPHASIS = /\*\*(?=\S)([^*\n]*?\S)\*\*|(?<![\w*])\*(?=[^\s*])([^*\n]*?[^\s*])\*(?![\w*])|(?<![\w_])_(?=[^\s_])([^_\n]*?[^\s_])_(?![\w_])/g;

/**
 * Split answer text on the model's markdown emphasis ("**XUE Records**",
 * "*Metiendo Mano!*") so the panel can show real bold and italics instead of
 * the symbols. Any "**" left without a partner, such as one still streaming in
 * or a bold that wraps a citation, is dropped so a reader never sees it. A
 * lone "*" or "_" stays: it can be ordinary text ("5 * 3", "file_name").
 */
export function splitBold(text: string): TextRun[] {
    const runs: TextRun[] = [];
    let cursor = 0;
    const plain = (s: string) => {
        const cleaned = s.replace(/\*\*/g, "");
        if (cleaned) runs.push({ text: cleaned, bold: false });
    };
    for (const m of text.matchAll(EMPHASIS)) {
        const at = m.index ?? 0;
        plain(text.slice(cursor, at));
        if (m[1] !== undefined) runs.push({ text: m[1], bold: true });
        else runs.push({ text: m[2] ?? m[3], bold: false, italic: true });
        cursor = at + m[0].length;
    }
    plain(text.slice(cursor));
    return runs;
}

/** One stretch of answer text, bold or plain. */
export interface TextRun {
    text: string;
    bold: boolean;
}

const BOLD = /\*\*(?=\S)([^*\n]*?\S)\*\*/g;

/**
 * Split answer text on the model's markdown bold ("**XUE Records**") so the
 * panel can show real bold instead of the asterisks. Any "**" left without a
 * partner, such as one still streaming in or a bold that wraps a citation, is
 * dropped so a reader never sees the symbols.
 */
export function splitBold(text: string): TextRun[] {
    const runs: TextRun[] = [];
    let cursor = 0;
    const plain = (s: string) => {
        const cleaned = s.replace(/\*\*/g, "");
        if (cleaned) runs.push({ text: cleaned, bold: false });
    };
    for (const m of text.matchAll(BOLD)) {
        const at = m.index ?? 0;
        plain(text.slice(cursor, at));
        runs.push({ text: m[1], bold: true });
        cursor = at + m[0].length;
    }
    plain(text.slice(cursor));
    return runs;
}

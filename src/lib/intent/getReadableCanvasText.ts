/** Old saved canvases may contain storage JSON or navigation; keep their source link, not opaque prose. */
export function getReadableCanvasText(text: string): string {
  if (
    /^\s*(?:\{\s*["}]|\[\s*[\[{"\]\d])/.test(text) ||
    /^\s*(?:(?:\d+\s+)?Skip to Content|Content)\s+(?:English\s+English|View fullsize|Menu)/i.test(
      text,
    )
  )
    return "";
  return text.trim();
}

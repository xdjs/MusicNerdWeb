"use client";

import { useEffect, useState } from "react";

/**
 * Copies `text` to the clipboard. `copied` turns true after a copy and resets
 * when `text` changes, so a button can read "Copied" for the value it copied.
 */
export function useCopy(text: string | undefined) {
  const [copied, setCopied] = useState(false);

  useEffect(() => setCopied(false), [text]);

  async function copy() {
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
  }

  return { copied, copy };
}

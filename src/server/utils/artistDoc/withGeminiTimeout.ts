import { GEMINI_TIMEOUT_MS } from "@/server/utils/artistDoc/geminiTimeouts";

/** Races a model call against a deadline; the loser keeps running, as before the AI Gateway switch (docs/llm.md). */
export function withGeminiTimeout<T>(p: Promise<T>, ms: number = GEMINI_TIMEOUT_MS): Promise<T> {
    return Promise.race([
        p,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Gemini timeout")), ms)),
    ]);
}

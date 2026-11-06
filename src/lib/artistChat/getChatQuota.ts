import { getQuestionQuota, type QuestionQuota } from "@/lib/questionResearch/getQuestionQuota";

/**
 * The hourly allowance behind a failed chat request, if that is what it was.
 * `DefaultChatTransport` throws an `APICallError` for a non-200 response,
 * carrying its status and raw body; a 429 body has the same `code`, `resetAt`
 * and `retryAfterSeconds` askArtist sent.
 *
 * @param error - `useChat`'s `error`.
 * @returns The quota, or `undefined` for any other error.
 */
export function getChatQuota(error: Error | undefined): QuestionQuota | undefined {
    const { statusCode, responseBody } = (error ?? {}) as { statusCode?: unknown; responseBody?: unknown };
    if (statusCode !== 429 || typeof responseBody !== "string") return undefined;
    try {
        return getQuestionQuota(JSON.parse(responseBody));
    } catch {
        return undefined;
    }
}

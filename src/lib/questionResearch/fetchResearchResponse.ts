import { getQuestionQuota } from './getQuestionQuota';

/** Wait only for transient short throttles. Budget quotas always require a new user action. */
export async function fetchResearchResponse(
  url: string,
  init: RequestInit & { signal: AbortSignal },
  onCooldown?: (seconds: number | null) => void,
): Promise<Response> {
  for (let retries = 0; ; retries++) {
    init.signal.throwIfAborted();
    const response = await fetch(url, init);
    const retryAfter = response.headers?.get("Retry-After");
    if (response.status !== 429 || !retryAfter || retries >= 3) return response;
    if (response.headers?.get('X-MusicNerd-Quota') === 'true') return response;
    // Preserve the original body for the caller. The code also identifies a
    // quota when an intermediary strips the dedicated header.
    const data = await response.clone?.().json().catch(() => undefined);
    if (getQuestionQuota(data)) return response;
    const numeric = Number(retryAfter);
    const waitMs = Number.isFinite(numeric)
      ? numeric * 1000
      : Date.parse(retryAfter) - Date.now();
    // Long/daily quotas remain explicit errors. Never shorten a server delay.
    if (!Number.isFinite(waitMs) || waitMs <= 0 || waitMs > 120000) return response;
    await response.body?.cancel().catch(() => undefined);
    onCooldown?.(Math.ceil(waitMs / 1000));
    await new Promise<void>((resolve, reject) => {
      const abort = () => {
        clearTimeout(timer);
        reject(init.signal.reason ?? new Error("Stopped waiting."));
      };
      const timer = setTimeout(() => {
        init.signal.removeEventListener("abort", abort);
        resolve();
      }, waitMs);
      if (init.signal.aborted) abort();
      else init.signal.addEventListener("abort", abort, { once: true });
    });
    onCooldown?.(null);
  }
}

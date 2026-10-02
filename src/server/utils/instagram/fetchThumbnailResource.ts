/**
 * Retry a temporary media/storage request once within the caller's shared
 * timeout. Callers validate the media host and disable redirects. Uploads use
 * immutable, job-scoped names, so a lost response cannot overwrite another job.
 *
 * @param url - An already validated media URL or configured storage URL.
 * @param init - Request options, including the thumbnail's shared abort signal.
 * @returns The response; throws a fixed diagnostic without URLs or credentials.
 */
export async function fetchThumbnailResource(url: string, init: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(url, init);
      const temporary = response.status === 408 || response.status === 429 || response.status >= 500;
      if (temporary && attempt === 0 && !init.signal?.aborted) {
        await response.body?.cancel();
        continue;
      }
      return response;
    } catch {
      if (init.signal?.aborted) throw new Error("request timeout");
      if (attempt === 1) throw new Error("request unavailable");
    }
  }
  throw new Error("request unavailable");
}

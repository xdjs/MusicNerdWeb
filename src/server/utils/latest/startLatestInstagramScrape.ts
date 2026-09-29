import { APIFY_API_TOKEN } from "@/env";
/** Caller persists provider-start intent before this non-retrying paid POST. */
export async function startLatestInstagramScrape(
  handle: string,
): Promise<string | null> {
  if (!APIFY_API_TOKEN || !/^[a-zA-Z0-9._]{1,30}$/.test(handle)) return null;
  const query = new URLSearchParams({
    maxTotalChargeUsd: "0.03",
    maxItems: "9",
    timeout: "180",
    restartOnError: "false",
  });
  try {
    const response = await fetch(
      `https://api.apify.com/v2/acts/apify~instagram-scraper/runs?${query}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${APIFY_API_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          directUrls: [`https://www.instagram.com/${handle}/`],
          resultsType: "posts",
          resultsLimit: 9,
          onlyPostsNewerThan: new Date(
            Date.now() - 30 * 86400000,
          ).toISOString(),
          addParentData: false,
        }),
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!response.ok) return null;
    const body = await response.json();
    return typeof body?.data?.id === "string" ? body.data.id : null;
  } catch {
    return null;
  }
}

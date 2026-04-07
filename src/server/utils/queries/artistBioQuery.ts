import { NextResponse } from "next/server";
import { getGemini, GEMINI_MODEL_PRO } from "@/server/lib/gemini";
import { getArtistById } from "@/server/utils/queries/artistQueries";
import { db } from "@/server/db/drizzle";
import { artists } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { musicPlatformData } from "@/server/utils/musicPlatform";
import { getVaultSourcesByArtistId } from "@/server/utils/queries/dashboardQueries";

/**
 * Generate an artist bio using Gemini Pro with Google Search grounding.
 * Unified function — used by the bio API route, dashboard actions, and artistLinkService.
 */
export async function generateArtistBio(artistId: string): Promise<NextResponse> {
  const artist = await getArtistById(artistId);
  if (!artist) {
    return NextResponse.json({ error: "Artist not found" }, { status: 404 });
  }

  // Compile platform data (Deezer primary, Spotify fallback)
  const PLATFORM_TIMEOUT_MS = 8000;
  let platformBioData = "";
  try {
    const platformArtist = await Promise.race([
      musicPlatformData.getArtist(artist),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), PLATFORM_TIMEOUT_MS)),
    ]);
    if (platformArtist) {
      platformBioData = [
        `Name: ${platformArtist.name}`,
        platformArtist.followerCount ? `Followers: ${platformArtist.followerCount}` : null,
        platformArtist.genres.length > 0 ? `Genres: ${platformArtist.genres.join(", ")}` : null,
        platformArtist.albumCount > 0 ? `Number of releases: ${platformArtist.albumCount}` : null,
        platformArtist.topTrackName ? `Top track: ${platformArtist.topTrackName}` : null,
      ].filter(Boolean).join(", ");
    }
  } catch (error) {
    console.error("Error fetching platform data for bio generation:", error);
  }

  // Put all informational sections of prompt together
  const promptParts: string[] = [];
  if (artist.spotify) promptParts.push(`Spotify ID: ${artist.spotify}`);
  if (artist.instagram) promptParts.push(`Instagram: https://instagram.com/${artist.instagram}`);
  if (artist.x) promptParts.push(`X: https://x.com/${artist.x}`);
  if (artist.soundcloud) promptParts.push(`SoundCloud: ${artist.soundcloud}`);
  if (artist.youtube) promptParts.push(`YouTube: https://youtube.com/@${artist.youtube.replace(/^@/, '')}`);
  if (artist.youtubechannel) promptParts.push(`YouTube Channel: ${artist.youtubechannel}`);
  if (artist.wikipedia) promptParts.push(`Wikipedia: ${artist.wikipedia}`);
  if (platformBioData) promptParts.push(`Music Platform Data: ${platformBioData}`);

  // Include approved vault sources as additional context
  let hasVaultContext = false;
  const vaultUrls: string[] = [];
  try {
    const vaultSources = await getVaultSourcesByArtistId(artistId, "approved");
    console.log(`[bio] Found ${vaultSources.length} approved vault sources for artist ${artistId}`);
    if (vaultSources.length > 0) {
      hasVaultContext = true;
      const vaultContext = vaultSources.map(s => {
        if (s.url) vaultUrls.push(s.url);
        const parts = [`Source: ${s.title ?? s.url}`];
        if (s.snippet) parts.push(s.snippet);
        if (s.extractedText) parts.push(s.extractedText.slice(0, 2000));
        return parts.join(" — ");
      }).join("\n");
      promptParts.push(`\n--- ARTIST-PROVIDED VAULT CONTEXT (USE THIS AS PRIMARY SOURCE) ---\n${vaultContext}\n--- END VAULT CONTEXT ---`);
    }
  } catch (e) {
    console.error("Error fetching vault sources for bio:", e);
  }

  try {
    const artistData = promptParts.join("\n");
    console.debug("Gemini artistData:", JSON.stringify(artistData, null, 2));

    const geminiStartTime = Date.now();

    const systemPrompt = hasVaultContext
      ? `You are a sharp, opinionated music journalist writing for a platform like Pitchfork or The FADER. Write a 2-3 paragraph bio for a music artist.

RULES:
- The vault context below is ARTIST-PROVIDED and your PRIMARY source. Extract specific facts: real names, locations, labels, collaborators, credits, timeline events, roles.
- Use the music platform data only for stats (follower count, release count, top track). Do NOT let genres drive the narrative.
- Write with personality and specificity. Name actual songs, projects, collaborators, and moments. Avoid filler phrases like "emerging force", "pushing boundaries", "sonic territories", or "artist to watch".
- If the vault mentions a label, collective, nonprofit, or side project, include it.
- End with a forward-looking line about what they're working on IF the vault provides that info. Otherwise just end strong.
- Do NOT include social media links in the bio text. Platform links are shown separately on the page.
- Be factual. Never speculate or fabricate credits/collabs.`
      : `You are a sharp, opinionated music journalist writing for a platform like Pitchfork or The FADER. Write a 2-3 paragraph bio for a music artist based on the data provided.

RULES:
- Write with specificity. Name actual songs, projects, and stats from the data.
- Avoid generic filler: no "emerging force", "pushing boundaries", "sonic territories", or "artist to watch".
- If data is limited, keep it short (1-2 paragraphs) rather than padding with vague praise.
- Do NOT include social media links in the bio text. Platform links are shown separately on the page.
- Be factual. Never speculate or fabricate.`;

    // Use Google Search grounding when vault sources exist (allows Gemini to visit those URLs)
    const useGrounding = hasVaultContext && vaultUrls.length > 0;

    const response = await Promise.race([
      getGemini().models.generateContent({
        model: GEMINI_MODEL_PRO,
        contents: `Write a bio for the artist "${artist.name!}". Here is what we know about them:\n${artistData}`,
        config: {
          systemInstruction: systemPrompt,
          ...(useGrounding ? { tools: [{ googleSearch: {} }] } : {}),
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini timeout')), 45000)
      )
    ]);

    const geminiEndTime = Date.now();
    const geminiDurationMs = geminiEndTime - geminiStartTime;

    const bio = response.text ?? "";
    console.debug("Gemini bio:", JSON.stringify(bio, null, 2));
    console.debug("Gemini call duration:", `${geminiDurationMs}ms`);

    if (bio) {
      await db.update(artists).set({ bio }).where(eq(artists.id, artistId));
    }

    return NextResponse.json({ bio });
  } catch (err: any) {
    console.error("Gemini error generating bio", err);
    if (err.message === 'Gemini timeout') {
      return NextResponse.json({ error: "Bio generation timed out" }, { status: 408 });
    }
    return NextResponse.json({ error: "Failed to generate bio" }, { status: 500 });
  }
}

/**
 * Simplified wrapper that returns just the bio string.
 * Used by artistLinkService for background bio regeneration.
 */
export async function regenerateArtistBio(artistId: string): Promise<string | null> {
  try {
    const response = await generateArtistBio(artistId);
    const data = await response.json();
    return data.bio ?? null;
  } catch (e) {
    console.error("[regenerateArtistBio] Error:", e);
    return null;
  }
}

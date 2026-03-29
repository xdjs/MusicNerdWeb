/**
 * Programmatic ID Mapping & Enrichment (Tier 1 + 2)
 *
 * Replaces LLM-driven Wikidata/MusicBrainz lookups with deterministic API calls.
 * See docs/programmatic-id-mapping-plan.md for full design.
 *
 * Usage:
 *   source .env.local
 *   npx tsx agents/id-mapping/programmatic-resolver.ts collect --out data/wikidata-enrichment.jsonl
 *   npx tsx agents/id-mapping/programmatic-resolver.ts import --file data/wikidata-enrichment.jsonl
 */

import postgres from "postgres";
import {
  readFileSync,
  appendFileSync,
  existsSync,
  writeFileSync,
  mkdirSync,
} from "fs";
import { dirname } from "path";

// --- Config ---

const DB_URL = process.env.SUPABASE_DB_CONNECTION;
const WIKIDATA_BATCH = parseInt(process.env.WIKIDATA_BATCH || "80", 10);
const DRY_RUN = process.env.DRY_RUN === "1";
const USER_AGENT =
  "MusicNerdWeb/1.0 (https://musicnerd.xyz; contact@musicnerd.xyz)";

// --- Types ---

interface Artist {
  id: string;
  name: string;
  spotifyId: string;
}

interface PlatformMapping {
  platform: string;
  id: string;
  verified?: boolean;
}

interface ArtistLink {
  column: string;
  value: string;
}

interface CollectedArtist {
  artistId: string;
  name: string;
  spotifyId: string;
  source: "wikidata" | "musicbrainz" | "both";
  wikidataId?: string;
  mappings: Record<string, { id: string; verified?: boolean }>;
  artistLinks: Record<string, string>;
}

interface CollectStats {
  totalArtists: number;
  wikidataMatched: number;
  wikidataDeezerVerified: number;
  musicbrainzDeezerResolved: number;
  totalDeezerResolved: number;
  skippedMultiEntity: number;
  errors: number;
}

// Wikidata property → target info
const WIKIDATA_PROPS: Record<
  string,
  { sparqlVar: string; platform?: string; artistColumn?: string }
> = {
  P2722: { sparqlVar: "deezer", platform: "deezer" },
  P2850: { sparqlVar: "apple", platform: "apple_music" },
  P434: { sparqlVar: "mbid", platform: "musicbrainz", artistColumn: "musicbrainz" },
  P7650: { sparqlVar: "tidal", platform: "tidal" },
  P7400: { sparqlVar: "amazonMusic", platform: "amazon_music" },
  P10625: { sparqlVar: "youtubeMusic", platform: "youtube_music" },
  P1953: { sparqlVar: "discogs", artistColumn: "discogs" },
  P2373: { sparqlVar: "genius", platform: "genius" },
  P1728: { sparqlVar: "allmusic", platform: "allmusic" },
  P3192: { sparqlVar: "lastfm", artistColumn: "lastfm" },
  P3040: { sparqlVar: "soundcloud", artistColumn: "soundcloud" },
  P4208: { sparqlVar: "billboard", platform: "billboard" },
  P345: { sparqlVar: "imdb", artistColumn: "imdb" },
  P3017: { sparqlVar: "rollingStone", platform: "rolling_stone" },
  P2397: { sparqlVar: "youtube", artistColumn: "youtubechannel" },
  P2002: { sparqlVar: "twitter", artistColumn: "x" },
  P2003: { sparqlVar: "instagram", artistColumn: "instagram" },
  P2013: { sparqlVar: "facebook", artistColumn: "facebookID" },
};

// --- Helpers ---

function log(msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] ${msg}`);
}

function warn(msg: string): void {
  const ts = new Date().toISOString().slice(11, 19);
  console.warn(`[${ts}] [WARN] ${msg}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^the\s+/, "")
    .replace(/\s+(feat\.?|ft\.?|featuring)\s+.*/i, "")
    .trim();
}

function namesMatch(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b);
}

function ensureDir(filePath: string): void {
  const dir = dirname(filePath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// --- External API helpers ---

async function queryWikidata(
  spotifyIds: string[],
): Promise<{ results: Map<string, Record<string, string[]>>; skippedMultiEntity: number }> {
  const values = spotifyIds.map((id) => `"${id}"`).join(" ");
  const optionals = Object.entries(WIKIDATA_PROPS)
    .map(([code, { sparqlVar }]) => `  OPTIONAL { ?item wdt:${code} ?${sparqlVar} }`)
    .join("\n");

  const sparql = `
SELECT ?item ?spotifyId
       ${Object.values(WIKIDATA_PROPS).map((p) => `?${p.sparqlVar}`).join(" ")}
WHERE {
  VALUES ?spotifyId { ${values} }
  ?item wdt:P1902 ?spotifyId .
  BIND(REPLACE(STR(?item), "http://www.wikidata.org/entity/", "") AS ?wikidata)
${optionals}
}`;

  const res = await fetch("https://query.wikidata.org/sparql", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "User-Agent": USER_AGENT,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `query=${encodeURIComponent(sparql)}`,
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    throw new Error(`Wikidata SPARQL error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const bindings = data.results?.bindings ?? [];

  // Group by spotifyId, track entities per spotifyId for multi-entity dedup
  const grouped = new Map<
    string,
    { entities: Set<string>; values: Record<string, Set<string>> }
  >();

  for (const row of bindings) {
    const spotifyId = row.spotifyId?.value;
    const entity = row.item?.value?.replace("http://www.wikidata.org/entity/", "");
    if (!spotifyId || !entity) continue;

    if (!grouped.has(spotifyId)) {
      grouped.set(spotifyId, { entities: new Set(), values: {} });
    }
    const entry = grouped.get(spotifyId)!;
    entry.entities.add(entity);

    // Collect wikidata entity ID
    if (!entry.values.wikidata) entry.values.wikidata = new Set();
    entry.values.wikidata.add(entity);

    // Collect all property values
    for (const { sparqlVar } of Object.values(WIKIDATA_PROPS)) {
      const val = row[sparqlVar]?.value;
      if (val) {
        if (!entry.values[sparqlVar]) entry.values[sparqlVar] = new Set();
        entry.values[sparqlVar].add(val);
      }
    }
  }

  // Filter: skip multi-entity matches (Case 1), pick first value for multi-value (Case 2)
  const results = new Map<string, Record<string, string[]>>();
  let skippedMultiEntity = 0;
  for (const [spotifyId, entry] of grouped) {
    if (entry.entities.size > 1) {
      warn(
        `Spotify ID ${spotifyId} matched ${entry.entities.size} Wikidata entities (${[...entry.entities].join(", ")}) — skipping`,
      );
      skippedMultiEntity++;
      continue;
    }
    const values: Record<string, string[]> = {};
    for (const [key, valSet] of Object.entries(entry.values)) {
      values[key] = [...valSet];
    }
    results.set(spotifyId, values);
  }

  return { results, skippedMultiEntity };
}

async function verifyDeezer(
  deezerId: string,
  expectedName: string,
): Promise<boolean> {
  try {
    const res = await fetch(`https://api.deezer.com/artist/${deezerId}`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.error) return false;
    return namesMatch(data.name ?? "", expectedName);
  } catch {
    return false;
  }
}

interface MusicBrainzResult {
  deezerId?: string;
  otherUrls: { platform: string; id: string }[];
}

async function queryMusicBrainzByMbid(
  mbid: string,
): Promise<MusicBrainzResult> {
  const res = await fetch(
    `https://musicbrainz.org/ws/2/artist/${mbid}?inc=url-rels&fmt=json`,
    { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(10_000) },
  );
  if (!res.ok) throw new Error(`MusicBrainz ${res.status}`);
  const data = await res.json();
  return parseMusicBrainzRelations(data.relations ?? []);
}

async function queryMusicBrainzByName(
  name: string,
): Promise<{ mbid: string } | null> {
  const res = await fetch(
    `https://musicbrainz.org/ws/2/artist/?query=artist:"${encodeURIComponent(name)}"&fmt=json&limit=5`,
    { headers: { "User-Agent": USER_AGENT }, signal: AbortSignal.timeout(10_000) },
  );
  if (!res.ok) throw new Error(`MusicBrainz search ${res.status}`);
  const data = await res.json();
  const artists = data.artists ?? [];

  // Require exact name match, reject ambiguous
  const matches = artists.filter(
    (a: { name: string }) => namesMatch(a.name, name),
  );
  if (matches.length === 1) return { mbid: matches[0].id };
  return null;
}

function parseMusicBrainzRelations(
  relations: { url?: { resource: string }; type: string }[],
): MusicBrainzResult {
  const result: MusicBrainzResult = { otherUrls: [] };

  for (const rel of relations) {
    const url = rel.url?.resource;
    if (!url) continue;

    // Deezer artist URL
    const deezerMatch = url.match(
      /deezer\.com\/(?:[a-z]{2}\/)?artist\/(\d+)/,
    );
    if (deezerMatch) {
      result.deezerId = deezerMatch[1];
      continue;
    }

    // Tidal
    const tidalMatch = url.match(/tidal\.com\/(?:browse\/)?artist\/(\d+)/);
    if (tidalMatch) {
      result.otherUrls.push({ platform: "tidal", id: tidalMatch[1] });
    }
  }

  return result;
}

// --- Collect command ---

async function collect(outFile: string): Promise<void> {
  if (!DB_URL) {
    console.error("SUPABASE_DB_CONNECTION env var is required");
    process.exit(1);
  }

  const sql = postgres(DB_URL, { prepare: false });
  ensureDir(outFile);

  // Load already-processed spotify IDs for resumability
  // Skip artists with source "error" so they get retried on resume
  const processed = new Set<string>();
  if (existsSync(outFile)) {
    const lines = readFileSync(outFile, "utf-8").split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const obj = JSON.parse(line);
        if (obj.spotifyId && obj.source !== "error") processed.add(obj.spotifyId);
      } catch {
        // skip malformed lines
      }
    }
    if (processed.size > 0) {
      log(`Resuming: ${processed.size} artists already in ${outFile}`);
    }
  }

  // Load all artists with Spotify IDs
  log("Loading artists from DB...");
  const allArtists = await sql<
    { id: string; name: string; spotify: string }[]
  >`
    SELECT id, name, spotify
    FROM artists
    WHERE spotify IS NOT NULL AND spotify != ''
    ORDER BY name
  `;
  log(`Loaded ${allArtists.length} artists with Spotify IDs`);

  const artists: Artist[] = allArtists
    .filter((a) => !processed.has(a.spotify))
    .map((a) => ({ id: a.id, name: a.name, spotifyId: a.spotify }));
  log(`${artists.length} remaining to process`);

  if (artists.length === 0) {
    log("Nothing to do");
    await sql.end();
    return;
  }

  const stats: CollectStats = {
    totalArtists: allArtists.length,
    wikidataMatched: 0,
    wikidataDeezerVerified: 0,
    musicbrainzDeezerResolved: 0,
    totalDeezerResolved: 0,
    skippedMultiEntity: 0,
    errors: 0,
  };

  // Build spotify→artist lookup
  const spotifyToArtist = new Map<string, Artist>();
  for (const a of artists) spotifyToArtist.set(a.spotifyId, a);

  // Track which artists still need Deezer resolution after Tier 1
  const needsDeezer = new Set<string>(artists.map((a) => a.spotifyId));

  // --- TIER 1: Wikidata SPARQL ---
  const totalBatches = Math.ceil(artists.length / WIKIDATA_BATCH);
  log(`Tier 1: Wikidata SPARQL — ${totalBatches} batches of ${WIKIDATA_BATCH}`);

  for (let i = 0; i < artists.length; i += WIKIDATA_BATCH) {
    const batch = artists.slice(i, i + WIKIDATA_BATCH);
    const batchNum = Math.floor(i / WIKIDATA_BATCH) + 1;
    let batchDeezer = 0;
    let batchMappings = 0;
    let batchLinks = 0;

    try {
      const { results: wikidataResults, skippedMultiEntity } = await queryWikidata(
        batch.map((a) => a.spotifyId),
      );
      stats.skippedMultiEntity += skippedMultiEntity;

      for (const artist of batch) {
        const wdValues = wikidataResults.get(artist.spotifyId);
        if (!wdValues) {
          // No Wikidata match — write empty line so resumability tracks it
          appendFileSync(
            outFile,
            JSON.stringify({
              artistId: artist.id,
              name: artist.name,
              spotifyId: artist.spotifyId,
              source: "none",
              mappings: {},
              artistLinks: {},
            }) + "\n",
          );
          continue;
        }

        stats.wikidataMatched++;
        const collected: CollectedArtist = {
          artistId: artist.id,
          name: artist.name,
          spotifyId: artist.spotifyId,
          source: "wikidata",
          wikidataId: wdValues.wikidata?.[0],
          mappings: {},
          artistLinks: {},
        };

        // Always save wikidata entity ID
        if (wdValues.wikidata?.[0]) {
          collected.artistLinks.wikidata = wdValues.wikidata[0];
          batchLinks++;
        }

        // Process each property
        for (const [, prop] of Object.entries(WIKIDATA_PROPS)) {
          const values = wdValues[prop.sparqlVar];
          if (!values || values.length === 0) continue;
          const val = values[0]; // Pick first for multi-value (Case 2)

          // Platform ID mapping
          if (prop.platform) {
            if (prop.platform === "deezer") {
              // Deezer requires name verification
              const verified = await verifyDeezer(val, artist.name);
              if (verified) {
                collected.mappings.deezer = { id: val, verified: true };
                needsDeezer.delete(artist.spotifyId);
                stats.wikidataDeezerVerified++;
                batchDeezer++;
                batchMappings++;
              }
            } else {
              collected.mappings[prop.platform] = { id: val };
              batchMappings++;
            }
          }

          // Artist table column
          if (prop.artistColumn) {
            collected.artistLinks[prop.artistColumn] = val;
            batchLinks++;
          }
        }

        appendFileSync(outFile, JSON.stringify(collected) + "\n");
      }
    } catch (err) {
      stats.errors++;
      warn(`Tier 1 batch ${batchNum} failed: ${err}`);
      // Write unprocessed artists as empty so resumability tracks them
      for (const artist of batch) {
        if (!processed.has(artist.spotifyId)) {
          appendFileSync(
            outFile,
            JSON.stringify({
              artistId: artist.id,
              name: artist.name,
              spotifyId: artist.spotifyId,
              source: "error",
              mappings: {},
              artistLinks: {},
            }) + "\n",
          );
        }
      }
    }

    if (batchNum % 10 === 0 || batchNum === totalBatches) {
      log(
        `Tier 1: batch ${batchNum}/${totalBatches} — ${batchDeezer} deezer, ${batchMappings} mappings, ${batchLinks} links`,
      );
    }

    // Rate limit: 1s between Wikidata batches
    if (i + WIKIDATA_BATCH < artists.length) await sleep(1000);
  }

  log(
    `Tier 1 complete: ${stats.wikidataMatched} Wikidata matches, ${stats.wikidataDeezerVerified} Deezer verified, ${needsDeezer.size} still need Deezer`,
  );

  // --- TIER 2: MusicBrainz ---
  const mbArtists = artists.filter((a) => needsDeezer.has(a.spotifyId));
  log(
    `Tier 2: MusicBrainz — ${mbArtists.length} artists (est. ~${Math.ceil(mbArtists.length / 3600)}h at 1 req/s, may be longer if name searches needed)`,
  );

  // Build MBID lookup from JSONL (written by Tier 1)
  const mbidLookup = new Map<string, string>();
  if (existsSync(outFile)) {
    const existingLines = readFileSync(outFile, "utf-8").split("\n").filter(Boolean);
    for (const line of existingLines) {
      try {
        const obj = JSON.parse(line);
        const mbid = obj.mappings?.musicbrainz?.id || obj.artistLinks?.musicbrainz;
        if (obj.spotifyId && mbid) mbidLookup.set(obj.spotifyId, mbid);
      } catch {
        // skip
      }
    }
  }

  // We write a second JSONL line with source="musicbrainz" for artists that get data.
  // The import step merges lines for the same artistId.

  let mbProcessed = 0;
  for (const artist of mbArtists) {
    mbProcessed++;
    try {
      const mbid = mbidLookup.get(artist.spotifyId);
      let mbResult: MusicBrainzResult | null = null;

      if (mbid) {
        // Path A: has MBID from Wikidata
        mbResult = await queryMusicBrainzByMbid(mbid);
      } else {
        // Path B: name search
        const searchResult = await queryMusicBrainzByName(artist.name);
        if (searchResult) {
          await sleep(1000); // Rate limit before relationship fetch
          mbResult = await queryMusicBrainzByMbid(searchResult.mbid);
        }
      }

      if (mbResult?.deezerId) {
        const verified = await verifyDeezer(mbResult.deezerId, artist.name);
        if (verified) {
          const mbLine: CollectedArtist = {
            artistId: artist.id,
            name: artist.name,
            spotifyId: artist.spotifyId,
            source: "musicbrainz",
            mappings: {
              deezer: { id: mbResult.deezerId, verified: true },
            },
            artistLinks: {},
          };
          // Add any other URLs found
          for (const url of mbResult.otherUrls) {
            mbLine.mappings[url.platform] = { id: url.id };
          }
          appendFileSync(outFile, JSON.stringify(mbLine) + "\n");
          stats.musicbrainzDeezerResolved++;
          needsDeezer.delete(artist.spotifyId);
        }
      }
    } catch (err) {
      if (String(err).includes("503") || String(err).includes("429")) {
        warn(`MusicBrainz rate limited on ${artist.name}, waiting 2s...`);
        await sleep(2000);
      } else {
        stats.errors++;
        if (mbProcessed % 100 === 0) {
          warn(`MusicBrainz error for ${artist.name}: ${err}`);
        }
      }
    }

    if (mbProcessed % 100 === 0) {
      log(
        `Tier 2: [${mbProcessed}/${mbArtists.length}] ${stats.musicbrainzDeezerResolved} deezer resolved`,
      );
    }

    // Rate limit: 1s between MusicBrainz requests
    await sleep(1000);
  }

  stats.totalDeezerResolved =
    stats.wikidataDeezerVerified + stats.musicbrainzDeezerResolved;

  // Write summary line
  const summary = {
    _summary: true,
    collectedAt: new Date().toISOString(),
    totalArtists: stats.totalArtists,
    wikidataMatched: stats.wikidataMatched,
    wikidataDeezerVerified: stats.wikidataDeezerVerified,
    musicbrainzDeezerResolved: stats.musicbrainzDeezerResolved,
    totalDeezerResolved: stats.totalDeezerResolved,
    skippedMultiEntity: stats.skippedMultiEntity,
    errors: stats.errors,
    remainingForClaude: artists.length - stats.totalDeezerResolved,
  };
  appendFileSync(outFile, JSON.stringify(summary) + "\n");

  log("");
  log("=== Collect Summary ===");
  log(`Duration:              ${process.uptime().toFixed(0)}s`);
  log(`Wikidata matches:      ${stats.wikidataMatched} / ${stats.totalArtists}`);
  log(`Deezer resolved:       ${stats.totalDeezerResolved} (Wikidata: ${stats.wikidataDeezerVerified} + MusicBrainz: ${stats.musicbrainzDeezerResolved})`);
  log(`Remaining for Claude:  ${artists.length - stats.totalDeezerResolved}`);
  log(`Errors:                ${stats.errors}`);
  log(`Output:                ${outFile}`);

  await sql.end();
}

// --- Import command ---

async function importData(inFile: string): Promise<void> {
  if (!DB_URL) {
    console.error("SUPABASE_DB_CONNECTION env var is required");
    process.exit(1);
  }
  if (!existsSync(inFile)) {
    console.error(`File not found: ${inFile}`);
    process.exit(1);
  }

  const sql = postgres(DB_URL, { prepare: false });

  log(`Reading ${inFile}...`);
  const lines = readFileSync(inFile, "utf-8").split("\n").filter(Boolean);

  // Parse all artist lines (skip summary)
  const artistMap = new Map<string, CollectedArtist>();
  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj._summary) continue;
      if (!obj.artistId) continue;

      // Merge multiple lines for the same artist (Tier 1 + Tier 2)
      const existing = artistMap.get(obj.artistId);
      if (existing) {
        existing.source = "both";
        Object.assign(existing.mappings, obj.mappings);
        // Don't overwrite existing artistLinks — Tier 1 (wikidata) is more comprehensive
        for (const [k, v] of Object.entries(obj.artistLinks ?? {})) {
          if (!existing.artistLinks[k]) existing.artistLinks[k] = v as string;
        }
      } else {
        artistMap.set(obj.artistId, {
          artistId: obj.artistId,
          name: obj.name,
          spotifyId: obj.spotifyId,
          source: obj.source,
          wikidataId: obj.wikidataId,
          mappings: obj.mappings ?? {},
          artistLinks: obj.artistLinks ?? {},
        });
      }
    } catch {
      // skip malformed lines
    }
  }

  log(`Parsed ${artistMap.size} artists from JSONL`);

  // --- Bulk insert: artist_id_mappings ---
  log("Inserting platform ID mappings...");

  let mappingsInserted = 0;
  let mappingsSkipped = 0;
  let slugCollisions = 0;

  // Collect all mapping rows
  const mappingRows: {
    artistId: string;
    platform: string;
    platformId: string;
    confidence: string;
    source: string;
  }[] = [];

  for (const artist of artistMap.values()) {
    for (const [platform, mapping] of Object.entries(artist.mappings)) {
      if (!mapping.id) continue;
      mappingRows.push({
        artistId: artist.artistId,
        platform,
        platformId: mapping.id,
        confidence: "high",
        source: artist.source === "musicbrainz" ? "musicbrainz" : "wikidata",
      });
    }
  }

  // Batch insert in chunks
  const CHUNK = 500;
  for (let i = 0; i < mappingRows.length; i += CHUNK) {
    const chunk = mappingRows.slice(i, i + CHUNK);
    if (DRY_RUN) {
      mappingsInserted += chunk.length;
      continue;
    }

    // Use a CTE to get which rows were actually inserted vs skipped
    const result = await sql`
      INSERT INTO artist_id_mappings (artist_id, platform, platform_id, confidence, source)
      SELECT artist_id::uuid, platform, platform_id, confidence::confidence_level, source FROM (VALUES
        ${sql(chunk.map((r) => [r.artistId, r.platform, r.platformId, r.confidence, r.source]))}
      ) AS v(artist_id, platform, platform_id, confidence, source)
      ON CONFLICT (artist_id, platform) DO NOTHING
      RETURNING artist_id, platform
    `;
    mappingsInserted += result.length;
    const skipped = chunk.length - result.length;
    mappingsSkipped += skipped;

    // Check for platform_id collisions (separate constraint)
    // These are silent with ON CONFLICT DO NOTHING — detect by trying individually
    // for the slug-based platforms
    if (skipped > 0) {
      const slugPlatforms = new Set([
        "genius",
        "allmusic",
        "billboard",
        "rolling_stone",
      ]);
      const insertedKeys = new Set(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        result.map((r: any) => `${r.artist_id}:${r.platform}`),
      );
      for (const row of chunk) {
        if (
          slugPlatforms.has(row.platform) &&
          !insertedKeys.has(`${row.artistId}:${row.platform}`)
        ) {
          slugCollisions++;
        }
      }
    }
  }

  log(
    `Mappings: ${mappingsInserted} inserted, ${mappingsSkipped} skipped (${slugCollisions} slug collisions)`,
  );

  // --- Update artists table columns ---
  log("Updating artist columns...");

  // Load current artist data for conflict detection
  const artistIds = [...artistMap.keys()];

  const currentData = new Map<
    string,
    Record<string, string | null>
  >();

  // Fetch in batches
  for (let i = 0; i < artistIds.length; i += 1000) {
    const idChunk = artistIds.slice(i, i + 1000);
    const rows = await sql`
      SELECT id, wikidata, musicbrainz, discogs, lastfm, soundcloud, imdb,
             youtubechannel, x, instagram, "facebookID"
      FROM artists
      WHERE id = ANY(${idChunk}::uuid[])
    `;
    for (const row of rows) {
      currentData.set(row.id, row as Record<string, string | null>);
    }
  }

  let columnsUpdated = 0;
  let columnsSkippedMatch = 0;
  let columnsSkippedPopulated = 0;
  const conflicts: {
    artistId: string;
    artistName: string;
    field: string;
    currentValue: string;
    wikidataValue: string;
    wikidataEntityId?: string;
  }[] = [];

  // Map from JSONL key → DB column name
  const jsonKeyToDbColumn: Record<string, string> = {
    wikidata: "wikidata",
    musicbrainz: "musicbrainz",
    discogs: "discogs",
    lastfm: "lastfm",
    soundcloud: "soundcloud",
    imdb: "imdb",
    youtubechannel: "youtubechannel",
    x: "x",
    instagram: "instagram",
    facebookID: "facebookID",
  };

  for (const artist of artistMap.values()) {
    const current = currentData.get(artist.artistId);
    if (!current) continue;

    const updates: Record<string, string> = {};

    for (const [jsonKey, value] of Object.entries(artist.artistLinks)) {
      const dbCol = jsonKeyToDbColumn[jsonKey];
      if (!dbCol) continue;

      const currentVal = current[dbCol];
      if (!currentVal || currentVal === "") {
        // Column is empty — write
        updates[dbCol] = value;
      } else if (currentVal === value) {
        // Already matches — skip
        columnsSkippedMatch++;
      } else {
        // Conflict — log it
        conflicts.push({
          artistId: artist.artistId,
          artistName: artist.name,
          field: dbCol,
          currentValue: currentVal,
          wikidataValue: value,
          wikidataEntityId: artist.wikidataId,
        });
        columnsSkippedPopulated++;
      }
    }

    if (Object.keys(updates).length > 0 && !DRY_RUN) {
      // Use parameterized query via postgres tagged template
      await sql`UPDATE artists SET ${sql(updates)}, updated_at = NOW() WHERE id = ${artist.artistId}::uuid`;
      columnsUpdated += Object.keys(updates).length;
    } else if (DRY_RUN) {
      columnsUpdated += Object.keys(updates).length;
    }
  }

  // Write conflicts file
  if (conflicts.length > 0) {
    const conflictsFile = inFile.replace(/\.jsonl$/, "-conflicts.json");
    ensureDir(conflictsFile);
    writeFileSync(
      conflictsFile,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          totalConflicts: conflicts.length,
          conflicts,
        },
        null,
        2,
      ),
    );
    log(`Conflicts: ${conflicts.length} (written to ${conflictsFile})`);
  }

  log("");
  log("=== Import Summary ===");
  log(`Mappings inserted:     ${mappingsInserted}`);
  log(`Mappings skipped:      ${mappingsSkipped} (${slugCollisions} slug collisions)`);
  log(`Columns updated:       ${columnsUpdated}`);
  log(`Columns skipped:       ${columnsSkippedMatch} (already match) + ${columnsSkippedPopulated} (conflicts)`);
  if (DRY_RUN) log("(DRY RUN — no writes performed)");

  await sql.end();
}

// --- CLI ---

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const cmd = args[0];

  if (cmd === "collect") {
    const outIdx = args.indexOf("--out");
    const outFile = outIdx >= 0 ? args[outIdx + 1] : "data/wikidata-enrichment.jsonl";
    if (!outFile) {
      console.error("Usage: programmatic-resolver.ts collect --out <file.jsonl>");
      process.exit(1);
    }
    await collect(outFile);
  } else if (cmd === "import") {
    const fileIdx = args.indexOf("--file");
    const inFile = fileIdx >= 0 ? args[fileIdx + 1] : undefined;
    if (!inFile) {
      console.error(
        "Usage: programmatic-resolver.ts import --file <file.jsonl>",
      );
      process.exit(1);
    }
    await importData(inFile);
  } else {
    console.error("Usage: programmatic-resolver.ts <collect|import> [options]");
    console.error("");
    console.error("Commands:");
    console.error(
      "  collect --out <file.jsonl>   Collect data from Wikidata/MusicBrainz",
    );
    console.error(
      "  import --file <file.jsonl>   Import collected data into DB",
    );
    console.error("");
    console.error("Environment variables:");
    console.error(
      "  SUPABASE_DB_CONNECTION       Postgres connection string (required)",
    );
    console.error(
      "  WIKIDATA_BATCH               Spotify IDs per SPARQL query (default: 80)",
    );
    console.error(
      "  DRY_RUN=1                    Skip writes in import step",
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

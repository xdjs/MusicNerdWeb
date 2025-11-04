# PRD: Artist Profile URL Migration - UUID to Human-Readable Slugs

## Document Information
- **Created**: 2025-11-04
- **Status**: Draft
- **Owner**: Engineering Team
- **Stakeholders**: Product, Engineering, SEO

---

## 1. Overview

Migrate artist profile URLs from UUID-based identifiers to human-readable slugs based on artist names. Current URLs use database IDs (e.g., `/artist/6c7adc24-1dd7-48d8-a931-d6c7d1fa91cd`), which will be replaced with name-based slugs (e.g., `/artist/fkj-6c7adc24`).

---

## 2. Problem Statement

**Current State:**
- Artist profile URLs use UUIDs: `https://www.musicnerd.xyz/artist/6c7adc24-1dd7-48d8-a931-d6c7d1fa91cd`
- URLs are not human-readable or memorable
- Poor user experience when sharing links
- Difficult to remember or manually type

**Desired State:**
- Artist profile URLs use name-based slugs: `https://www.musicnerd.xyz/artist/fkj-6c7adc24`
- URLs are human-readable and shareable
- Improved user experience
- Better for social media sharing and word-of-mouth

---

## 3. Goals and Non-Goals

### Goals
✅ Create human-readable URLs for artist profiles
✅ Improve shareability on social media platforms
✅ Enhance user experience and memorability
✅ Handle duplicate artist names gracefully
✅ Support artist name changes over time
✅ Preserve URL-safe special characters in artist names

### Non-Goals
❌ Maintain backward compatibility with old UUID-only URLs
❌ SEO optimization (not the primary driver)
❌ Internationalization/localization of slugs
❌ Custom vanity URLs (e.g., `/artist/fkj` without ID)

---

## 4. User Stories

### As a music fan sharing an artist
> "When I share FKJ's profile on Twitter, I want the URL to include the artist's name so my followers know who I'm sharing before clicking"

### As a user navigating the site
> "When I look at my browser's address bar, I want to see which artist profile I'm viewing without having to check the page title"

### As a user bookmarking artists
> "When I bookmark an artist profile, I want the browser bookmark title to show a readable URL so I can find it later"

### As a community contributor
> "When I add a new artist named 'Jordan', the system should automatically handle the fact that another artist named 'Jordan' already exists"

---

## 5. Requirements

### 5.1 URL Structure

**Format:** `/artist/{slug}-{short-id}`

**Components:**
- `{slug}`: URL-encoded artist name (lowercase, URL-safe characters preserved)
- `{short-id}`: First 8 characters of the UUID (for uniqueness)

**Examples:**
- FKJ → `/artist/fkj-6c7adc24`
- Beyoncé → `/artist/beyoncé-a1b2c3d4`
- A$AP Rocky → `/artist/a$ap-rocky-e5f6g7h8`
- deadmau5 → `/artist/deadmau5-i9j0k1l2`

### 5.2 Slug Generation Rules

1. **Preserve Original Characters**: Keep all URL-safe characters from the artist name
   - Allowed: `a-z`, `A-Z`, `0-9`, `-`, `_`, `.`, `~`, accented characters (é, ñ, etc.)
   - Convert spaces to hyphens
   - Remove or encode: `<`, `>`, `#`, `%`, `{`, `}`, `|`, `\`, `^`, `[`, `]`, `` ` ``, `;`, `/`, `?`, `:`, `@`, `=`, `&`

2. **Case Handling**: Convert to lowercase for consistency

3. **Multiple Spaces/Hyphens**: Collapse consecutive hyphens to single hyphen

4. **Trim**: Remove leading/trailing hyphens

### 5.3 Duplicate Artist Name Handling

**Strategy:** Append short ID (first 8 chars of UUID) to all artist slugs

**Rationale:**
- Ensures uniqueness without database lookups
- Prevents race conditions during artist creation
- Simplifies URL generation logic
- Handles edge cases (same name, same time creation)

**Trade-off:** Slightly longer URLs, but guaranteed uniqueness

### 5.4 Artist Name Updates

**Behavior:** When artist name changes:
1. Generate new slug based on new name
2. Keep original short-id (UUID prefix remains same)
3. Create redirect from old slug to new slug
4. Store slug history for redirects

**Example:**
- Original: `/artist/prince-abc12345`
- Name changes to: "The Artist Formerly Known As Prince"
- New URL: `/artist/the-artist-formerly-known-as-prince-abc12345`
- Old URL redirects to new URL

---

## 6. Technical Solution

### 6.1 Database Schema Changes

**Add new columns to `artists` table:**

```sql
ALTER TABLE artists
ADD COLUMN slug TEXT,
ADD COLUMN slug_updated_at TIMESTAMP WITH TIME ZONE;

-- Create index for slug lookups
CREATE INDEX idx_artists_slug ON artists(slug);

-- Create unique constraint on slug
CREATE UNIQUE INDEX idx_artists_slug_unique ON artists(slug);
```

**Add new table for slug history (redirects):**

```sql
CREATE TABLE artist_slug_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  old_slug TEXT NOT NULL,
  new_slug TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc'),
  UNIQUE(old_slug)
);

-- Index for redirect lookups
CREATE INDEX idx_artist_slug_history_old_slug ON artist_slug_history(old_slug);
CREATE INDEX idx_artist_slug_history_artist_id ON artist_slug_history(artist_id);
```

### 6.2 Slug Generation Function

**Server-side utility function:**

```typescript
// src/server/utils/slugGenerator.ts

/**
 * Generates a URL-safe slug from an artist name and ID
 * @param name - Artist name
 * @param id - Artist UUID
 * @returns Slug in format: {name-slug}-{short-id}
 */
export function generateArtistSlug(name: string, id: string): string {
  // Extract first 8 characters of UUID as short ID
  const shortId = id.substring(0, 8);

  // Convert name to slug
  const nameSlug = name
    .toLowerCase()
    .trim()
    // Replace spaces with hyphens
    .replace(/\s+/g, '-')
    // Remove disallowed URL characters
    .replace(/[<>#%{}|\\^[\]`;/?:@=&]/g, '')
    // Collapse multiple hyphens
    .replace(/-+/g, '-')
    // Trim hyphens from start/end
    .replace(/^-+|-+$/g, '');

  return `${nameSlug}-${shortId}`;
}

/**
 * Extracts artist ID from slug
 * @param slug - Artist slug (e.g., "fkj-6c7adc24")
 * @returns Short ID or null if invalid
 */
export function extractShortIdFromSlug(slug: string): string | null {
  // Extract last segment after final hyphen
  const segments = slug.split('-');
  const shortId = segments[segments.length - 1];

  // Validate it looks like a hex UUID prefix (8 chars, alphanumeric)
  if (/^[a-f0-9]{8}$/i.test(shortId)) {
    return shortId;
  }

  return null;
}

/**
 * Looks up artist by slug
 * Checks current slug first, then slug history for redirects
 */
export async function getArtistBySlug(slug: string): Promise<{
  artist: Artist | null;
  shouldRedirect: boolean;
  redirectSlug?: string;
}> {
  // First, try to find by current slug
  const artist = await db.query.artists.findFirst({
    where: eq(artists.slug, slug)
  });

  if (artist) {
    return { artist, shouldRedirect: false };
  }

  // Check slug history for redirects
  const history = await db.query.artistSlugHistory.findFirst({
    where: eq(artistSlugHistory.oldSlug, slug)
  });

  if (history) {
    const redirectedArtist = await db.query.artists.findFirst({
      where: eq(artists.id, history.artistId)
    });

    if (redirectedArtist) {
      return {
        artist: redirectedArtist,
        shouldRedirect: true,
        redirectSlug: redirectedArtist.slug ?? undefined
      };
    }
  }

  // Fallback: try to extract short ID and do prefix search on UUID
  const shortId = extractShortIdFromSlug(slug);
  if (shortId) {
    const fallbackArtist = await db.query.artists.findFirst({
      where: sql`${artists.id}::text LIKE ${shortId + '%'}`
    });

    if (fallbackArtist) {
      return {
        artist: fallbackArtist,
        shouldRedirect: true,
        redirectSlug: fallbackArtist.slug ?? undefined
      };
    }
  }

  return { artist: null, shouldRedirect: false };
}
```

### 6.3 Route Changes

**Update dynamic route:** `src/app/artist/[slug]/page.tsx` (rename from `[id]`)

```typescript
// src/app/artist/[slug]/page.tsx

type ArtistProfileProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | undefined }>;
}

export default async function ArtistProfile({ params, searchParams }: ArtistProfileProps) {
  const { slug } = await params;

  // Look up artist by slug
  const { artist, shouldRedirect, redirectSlug } = await getArtistBySlug(slug);

  if (!artist) {
    return notFound();
  }

  // Handle redirects for old slugs
  if (shouldRedirect && redirectSlug) {
    redirect(`/artist/${redirectSlug}`);
  }

  // Rest of component logic remains the same
  // ...
}
```

### 6.4 API Route Updates

**Update all references to artist IDs in URLs:**

Files to update:
- `src/app/_components/nav/components/SearchBar.tsx` (lines 199, 252, 582, 620)
- `src/app/_components/nav/components/AddArtist.tsx` (lines 152, 155, 221, 224)
- `src/app/add-artist/_components/AddArtistContent.tsx` (lines 54, 56)
- `src/app/profile/Leaderboard.tsx` (line 255)
- `src/app/profile/Dashboard.tsx` (lines 92, 950)
- `src/__tests__/components/AddArtist.test.tsx` (lines 59, 60)
- `src/__tests__/components/SearchBar.test.tsx` (line 103)

**Pattern to replace:**
```typescript
// OLD
router.push(`/artist/${artist.id}`)

// NEW
router.push(`/artist/${artist.slug}`)
```

### 6.5 Artist Creation/Update Flow

**On artist creation (`addArtist` function):**

```typescript
// In src/server/utils/queries/artistQueries.ts

export async function addArtist(spotifyId: string): Promise<AddArtistResp> {
  // ... existing code ...

  const artistData = {
    spotify: spotifyId,
    lcname: normaliseText(spotifyArtist.data.name),
    name: spotifyArtist.data.name,
    addedBy: session?.user?.id || undefined,
    slug: null, // Will be generated after insert (need UUID first)
  };

  const [newArtist] = await db.insert(artists).values(artistData).returning();

  // Generate and update slug
  const slug = generateArtistSlug(newArtist.name ?? '', newArtist.id);
  await db.update(artists)
    .set({ slug, slugUpdatedAt: new Date().toISOString() })
    .where(eq(artists.id, newArtist.id));

  // Return with slug
  return {
    status: "success",
    artistId: newArtist.id,
    artistSlug: slug, // Add slug to response
    artistName: newArtist.name ?? "",
    message: "Success! You can now find this artist in our directory",
  };
}
```

**On artist name update:**

```typescript
// New function in artistQueries.ts

export async function updateArtistName(
  artistId: string,
  newName: string
): Promise<{ status: "success" | "error"; message: string }> {
  try {
    const artist = await getArtistById(artistId);
    if (!artist) {
      return { status: "error", message: "Artist not found" };
    }

    const oldSlug = artist.slug;
    const newSlug = generateArtistSlug(newName, artistId);

    // Update artist name and slug
    await db.update(artists)
      .set({
        name: newName,
        lcname: normaliseText(newName),
        slug: newSlug,
        slugUpdatedAt: new Date().toISOString()
      })
      .where(eq(artists.id, artistId));

    // Store old slug in history if it changed
    if (oldSlug && oldSlug !== newSlug) {
      await db.insert(artistSlugHistory).values({
        artistId,
        oldSlug,
        newSlug,
      });
    }

    return { status: "success", message: "Artist name updated" };
  } catch (e) {
    console.error("Error updating artist name:", e);
    return { status: "error", message: "Failed to update artist name" };
  }
}
```

---

## 7. Migration Strategy

### 7.1 Database Migration

**Migration script:** `migrations/YYYY-MM-DD-add-artist-slugs.sql`

```sql
-- Step 1: Add columns
ALTER TABLE artists
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS slug_updated_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Create slug history table
CREATE TABLE IF NOT EXISTS artist_slug_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  artist_id UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
  old_slug TEXT NOT NULL,
  new_slug TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() AT TIME ZONE 'utc'),
  UNIQUE(old_slug)
);

-- Step 3: Populate slugs for existing artists
-- This will be done via a Node.js script due to complex slug generation logic

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_artists_slug ON artists(slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_artists_slug_unique ON artists(slug);
CREATE INDEX IF NOT EXISTS idx_artist_slug_history_old_slug ON artist_slug_history(old_slug);
CREATE INDEX IF NOT EXISTS idx_artist_slug_history_artist_id ON artist_slug_history(artist_id);

-- Step 5: Make slug NOT NULL after population (in separate migration)
-- ALTER TABLE artists ALTER COLUMN slug SET NOT NULL;
```

### 7.2 Data Population Script

**Script:** `scripts/populate-artist-slugs.ts`

```typescript
import { db } from "@/server/db/drizzle";
import { artists } from "@/server/db/schema";
import { generateArtistSlug } from "@/server/utils/slugGenerator";
import { sql } from "drizzle-orm";

async function populateArtistSlugs() {
  console.log("Starting slug population...");

  // Fetch all artists without slugs
  const artistsToUpdate = await db
    .select()
    .from(artists)
    .where(sql`${artists.slug} IS NULL`);

  console.log(`Found ${artistsToUpdate.length} artists to update`);

  let updated = 0;
  let errors = 0;

  for (const artist of artistsToUpdate) {
    try {
      if (!artist.name) {
        console.warn(`Artist ${artist.id} has no name, skipping`);
        continue;
      }

      const slug = generateArtistSlug(artist.name, artist.id);

      await db
        .update(artists)
        .set({
          slug,
          slugUpdatedAt: new Date().toISOString()
        })
        .where(sql`${artists.id} = ${artist.id}`);

      updated++;

      if (updated % 100 === 0) {
        console.log(`Progress: ${updated}/${artistsToUpdate.length}`);
      }
    } catch (error) {
      console.error(`Failed to update artist ${artist.id}:`, error);
      errors++;
    }
  }

  console.log(`
    Migration complete!
    ✅ Updated: ${updated}
    ❌ Errors: ${errors}
  `);
}

populateArtistSlugs()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
```

### 7.3 Deployment Plan

**Phase 1: Database Preparation (Week 1)**
1. Run database migration to add columns and tables
2. Run data population script to generate slugs for existing artists
3. Verify data integrity (all artists have valid slugs)

**Phase 2: Code Deployment (Week 2)**
1. Deploy slug generation utilities
2. Update artist creation/update flows to use slugs
3. Monitor for any slug generation issues
4. **DO NOT** update routes yet - keep using UUIDs in URLs

**Phase 3: Route Migration (Week 3)**
1. Rename `[id]` directory to `[slug]`
2. Update all internal links to use slugs
3. Deploy route changes
4. Monitor 404 errors and redirect issues
5. Test all artist profile pages

**Phase 4: Cleanup (Week 4)**
1. Make `slug` column NOT NULL
2. Add database constraint to enforce slug presence
3. Remove any fallback UUID logic if not needed

---

## 8. Edge Cases & Error Handling

### 8.1 Edge Cases

| Case | Behavior | Example |
|------|----------|---------|
| Artist with no name | Use "unknown-{shortId}" | `/artist/unknown-6c7adc24` |
| Artist with only special chars | Use "artist-{shortId}" | `/artist/artist-6c7adc24` |
| Very long artist names | Truncate to 100 chars | `/artist/very-long-name-that-goes-on-and-on-6c7adc24` |
| Name with emoji | Remove emoji | `"FKJ ❤️"` → `/artist/fkj-6c7adc24` |
| Duplicate slugs (rare) | Short ID ensures uniqueness | Multiple "FKJ" artists get different short IDs |
| Slug collision | Database unique constraint prevents | Error during insert, regenerate with fallback |

### 8.2 Error Handling

**404 Not Found:**
- Artist slug not found in database
- Artist slug not found in history
- Short ID extraction fails
- Fallback UUID search fails
→ Show Next.js 404 page

**Redirect Loop Prevention:**
- Track redirect count (max 3)
- Log infinite redirect attempts
- Fall back to 404 after max redirects

**Invalid Slug Characters:**
- Validate slug format on lookup
- Return 404 for obviously malformed slugs
- Log suspicious slug patterns for monitoring

---

## 9. Testing Requirements

### 9.1 Unit Tests

**Slug Generation (`slugGenerator.test.ts`):**
```typescript
describe('generateArtistSlug', () => {
  it('generates slug for simple name', () => {
    expect(generateArtistSlug('FKJ', '6c7adc24-1dd7-48d8-a931-d6c7d1fa91cd'))
      .toBe('fkj-6c7adc24');
  });

  it('handles accented characters', () => {
    expect(generateArtistSlug('Beyoncé', 'a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6'))
      .toBe('beyoncé-a1b2c3d4');
  });

  it('handles special characters', () => {
    expect(generateArtistSlug('A$AP Rocky', 'e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0'))
      .toBe('a$ap-rocky-e5f6g7h8');
  });

  it('removes disallowed characters', () => {
    expect(generateArtistSlug('Artist<>Name', '12345678-abcd-efgh-ijkl-mnopqrstuvwx'))
      .toBe('artistname-12345678');
  });

  it('collapses multiple spaces', () => {
    expect(generateArtistSlug('The  Artist   Name', '12345678-abcd-efgh-ijkl-mnopqrstuvwx'))
      .toBe('the-artist-name-12345678');
  });
});

describe('extractShortIdFromSlug', () => {
  it('extracts valid short ID', () => {
    expect(extractShortIdFromSlug('fkj-6c7adc24')).toBe('6c7adc24');
  });

  it('handles complex slug', () => {
    expect(extractShortIdFromSlug('a$ap-rocky-e5f6g7h8')).toBe('e5f6g7h8');
  });

  it('returns null for invalid format', () => {
    expect(extractShortIdFromSlug('invalid-slug')).toBeNull();
  });
});
```

### 9.2 Integration Tests

**Artist Creation:**
- Create new artist → verify slug is generated
- Create duplicate named artist → verify different short IDs
- Create artist with special chars → verify slug is URL-safe

**Artist Lookup:**
- Look up by current slug → finds artist
- Look up by old slug → redirects to new slug
- Look up by invalid slug → returns 404

**Artist Name Update:**
- Update name → new slug generated
- Old slug → redirects to new slug
- Multiple updates → all old slugs redirect to latest

### 9.3 E2E Tests

**User Flows:**
1. Search for artist → click result → verify URL contains name
2. Share artist page → verify URL is human-readable
3. Navigate to old slug (after name change) → verify redirect
4. Bookmark artist → change name → verify bookmark still works

---

## 10. Success Metrics

### 10.1 Technical Metrics

- **Slug Generation Success Rate**: >99.9% of artists have valid slugs
- **Redirect Success Rate**: >99% of old slugs successfully redirect
- **404 Error Rate**: <0.1% increase in 404s post-migration
- **Page Load Time**: No degradation in artist page load time

### 10.2 User Experience Metrics

- **Share Rate**: Track increase in social media shares (via UTM tracking)
- **Link Recall**: Survey users on ability to remember/type URLs
- **User Feedback**: Qualitative feedback on URL readability

### 10.3 Monitoring & Alerts

**Dashboards:**
- Slug generation errors (daily count)
- 404 rate on `/artist/*` routes
- Redirect count (old slug → new slug)
- Duplicate slug conflicts

**Alerts:**
- Spike in artist profile 404s (>5% increase)
- Slug generation failures (>10 per hour)
- Database unique constraint violations on slug column

---

## 11. Security Considerations

### 11.1 Injection Protection

- **SQL Injection**: All slug lookups use parameterized queries
- **XSS**: Slugs are URL-encoded, not rendered as HTML
- **Path Traversal**: Validate slug format before DB lookup

### 11.2 Rate Limiting

- Limit slug lookups to prevent enumeration attacks
- Monitor for suspicious slug scanning patterns

### 11.3 Privacy

- Artist names are public information (already displayed)
- No PII in slugs (only artist names)

---

## 12. Open Questions

1. **Should we support legacy UUID-only URLs?**
   - Decision: NO (per requirements)
   - Rationale: Simplifies implementation, reduces technical debt

2. **How to handle artist merges/splits?**
   - Example: Band breaks up, becomes two solo artists
   - Proposed: Manual admin process, create slug history entries

3. **Should slug length be limited?**
   - Proposed: Truncate at 100 characters for readability
   - Browser URL limits are ~2000 chars, so plenty of headroom

4. **What about artist name collisions at exact moment of creation?**
   - Resolution: Short ID (UUID prefix) ensures uniqueness
   - No race condition possible

---

## 13. Dependencies

### External Dependencies
- None (all changes are internal)

### Internal Dependencies
- Database migration must complete before code deploy
- Slug generation utility must be deployed before route changes

---

## 14. Timeline Estimate

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Planning** | 1 week | PRD review, technical design, schema finalization |
| **Development** | 2 weeks | Slug utilities, DB migration, route updates, tests |
| **Testing** | 1 week | Unit, integration, E2E tests, QA review |
| **Migration** | 1 week | DB migration, data population, verification |
| **Deployment** | 1 week | Phased rollout, monitoring, bug fixes |
| **Total** | **6 weeks** | |

---

## 15. Appendix

### 15.1 URL Encoding Reference

**Allowed in URL paths (RFC 3986):**
- Unreserved: `A-Z a-z 0-9 - _ . ~`
- Reserved (with special meaning): `: / ? # [ ] @ ! $ & ' ( ) * + , ; =`
- Percent-encoded: `%XX` for any byte

**Our slug policy:**
- Keep: `a-z 0-9 - _ . ~` and accented characters (é, ñ, etc.)
- Remove/encode: Everything else

### 15.2 Example URL Transformations

| Artist Name | Current URL | New URL |
|-------------|-------------|---------|
| FKJ | `/artist/6c7adc24-1dd7-48d8-a931-d6c7d1fa91cd` | `/artist/fkj-6c7adc24` |
| Beyoncé | `/artist/a1b2c3d4-e5f6-g7h8-i9j0-k1l2m3n4o5p6` | `/artist/beyoncé-a1b2c3d4` |
| A$AP Rocky | `/artist/e5f6g7h8-i9j0-k1l2-m3n4-o5p6q7r8s9t0` | `/artist/a$ap-rocky-e5f6g7h8` |
| deadmau5 | `/artist/12345678-abcd-efgh-ijkl-mnopqrstuvwx` | `/artist/deadmau5-12345678` |
| The Weeknd | `/artist/87654321-zyxw-vutr-qpon-mlkjihgfedcb` | `/artist/the-weeknd-87654321` |

### 15.3 Database Schema (Drizzle)

```typescript
// Update to src/server/db/schema.ts

export const artists = pgTable("artists", {
  id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey().notNull(),
  name: text("name"),
  slug: text("slug").unique(), // NEW
  slugUpdatedAt: timestamp("slug_updated_at", { withTimezone: true, mode: 'string' }), // NEW
  // ... rest of existing columns
});

export const artistSlugHistory = pgTable("artist_slug_history", {
  id: uuid("id").default(sql`uuid_generate_v4()`).primaryKey().notNull(),
  artistId: uuid("artist_id").notNull().references(() => artists.id, { onDelete: "cascade" }),
  oldSlug: text("old_slug").notNull(),
  newSlug: text("new_slug").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`(now() AT TIME ZONE 'utc'::text)`).notNull(),
}, (table) => {
  return {
    uniqueOldSlug: unique("artist_slug_history_old_slug_key").on(table.oldSlug),
  };
});
```

---

## 16. Approval & Sign-off

- [ ] Product Owner
- [ ] Engineering Lead
- [ ] QA Lead
- [ ] DevOps Lead

---

**END OF PRD**

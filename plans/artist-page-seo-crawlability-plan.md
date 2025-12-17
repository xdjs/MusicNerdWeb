# Artist Page SEO & Crawlability Implementation Plan

## Summary

Make artist pages crawlable by search engines and generate rich social media previews by:
1. Adding dynamic metadata generation (Open Graph, Twitter cards)
2. Moving artist bio fetching to server-side

**Out of scope:** Fun facts will remain client-side interactive features.

---

## Problem Analysis

### Current State
| Content | Rendering | Crawlable? |
|---------|-----------|------------|
| Artist name, image, links | Server-side | ✅ Yes |
| Meta tags (title, og:image) | Static/generic | ❌ No (shows "Music Nerd") |
| Artist bio | Client-side (`useArtistBio` hook) | ❌ No |
| Fun facts | Client-side (on-demand) | ❌ No (keeping as-is) |

### Target State
| Content | Rendering | Crawlable? |
|---------|-----------|------------|
| Artist name, image, links | Server-side | ✅ Yes |
| Meta tags | Dynamic per artist | ✅ Yes |
| Artist bio | Server-side | ✅ Yes |
| Fun facts | Client-side | ❌ No (by design) |

---

## Implementation Tasks

### Task 1: Add `generateMetadata` Function

**File:** `src/app/artist/[id]/page.tsx`

**Changes:**
1. Add `Metadata` type import from `next`
2. Add `generateMetadata` async function export that:
   - Fetches artist by ID using `getArtistById()`
   - Fetches Spotify image using `getSpotifyImage()`
   - Returns metadata object with:
     - `title`: `"${artist.name} | Music Nerd"`
     - `description`: `"Discover ${artist.name}'s social links and streaming profiles on Music Nerd."`
     - `openGraph.type`: `"profile"`
     - `openGraph.url`: `"https://www.musicnerd.xyz/artist/${id}"`
     - `openGraph.images`: Artist's Spotify image (640x640)
     - `twitter.card`: `"summary_large_image"`
     - `twitter.images`: Artist's Spotify image

**Handles edge cases:**
- Artist not found → generic "Artist Not Found" metadata
- No Spotify image → fallback to `/default_pfp_pink.png`

---

### Task 2: Fetch Bio Server-Side in Page Component

**File:** `src/app/artist/[id]/page.tsx`

**Changes:**
1. Import `getArtistBio` function (to be created)
2. In `ArtistProfile` async function, fetch bio server-side:
   ```typescript
   const bio = artist.bio || null;  // Bio is already on the artist record
   ```
3. Pass `initialBio` prop to `BlurbSection`:
   ```typescript
   <BlurbSection
     artistName={artist.name ?? ""}
     artistId={artist.id}
     initialBio={bio}
   />
   ```

---

### Task 3: Update BlurbSection to Accept Server-Side Bio

**File:** `src/app/artist/[id]/_components/BlurbSection.tsx`

**Changes:**
1. Add `initialBio` prop to interface:
   ```typescript
   interface BlurbSectionProps {
     artistName: string;
     artistId: string;
     initialBio?: string | null;
   }
   ```

2. Modify `useArtistBio` hook usage:
   - If `initialBio` is provided and non-empty, use it as initial state
   - Skip the initial fetch if `initialBio` exists
   - Still allow refetch/regenerate functionality for admins

3. Render bio in initial HTML (not just after client hydration):
   - If `initialBio` exists, render it immediately
   - Show placeholder "Bio coming soon" if no bio exists
   - Loading state only shown during regeneration

---

### Task 4: Update useArtistBio Hook to Support Initial Value

**File:** `src/hooks/useArtistBio.ts`

**Changes:**
1. Add `initialBio` parameter:
   ```typescript
   export function useArtistBio(artistId: string, initialBio?: string | null)
   ```

2. Initialize state with `initialBio` if provided:
   ```typescript
   const [bio, setBio] = useState<string | null>(initialBio ?? null);
   const [loading, setLoading] = useState(!initialBio);
   ```

3. Skip initial fetch if `initialBio` is provided:
   ```typescript
   useEffect(() => {
     if (initialBio) return; // Skip fetch, already have data
     fetchBio();
   }, [artistId, initialBio]);
   ```

4. Keep `refetch` function for admin regeneration functionality

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/app/artist/[id]/page.tsx` | Add `generateMetadata`, pass `initialBio` to BlurbSection |
| `src/app/artist/[id]/_components/BlurbSection.tsx` | Accept `initialBio` prop, render server-side content |
| `src/hooks/useArtistBio.ts` | Support `initialBio` parameter, skip fetch if provided |

---

## Data Flow (After Implementation)

```
Browser/Crawler requests /artist/[id]
         ↓
generateMetadata() runs server-side
  → Fetches artist + Spotify image
  → Returns dynamic meta tags
         ↓
ArtistProfile() runs server-side
  → Fetches artist (has bio column)
  → Passes bio to BlurbSection
         ↓
HTML Response includes:
  ✅ <title>Drake | Music Nerd</title>
  ✅ <meta property="og:image" content="spotify-image.jpg">
  ✅ <div class="bio">Drake is a Canadian rapper...</div>
         ↓
Client hydration
  → BlurbSection initializes with server bio
  → No client fetch needed (already has data)
  → Admin can still regenerate via refetch()
```

---

## Testing Plan

1. **Meta tags verification:**
   - View page source to confirm dynamic title/description
   - Use Facebook Sharing Debugger, Twitter Card Validator
   - Test with `curl -A "Twitterbot"` to see crawler response

2. **Bio crawlability:**
   - View page source (Cmd+U) to confirm bio is in initial HTML
   - Disable JavaScript and verify bio still displays

3. **Functionality preserved:**
   - Admin regenerate bio still works
   - Edit mode still works
   - Loading states work during regeneration

4. **Edge cases:**
   - Artist with no bio shows placeholder
   - Artist not found shows 404 with appropriate meta
   - Artist with no Spotify image uses fallback

---

## Expected Results

**Social media preview (X, iMessage, Discord):**
- Title: "Drake | Music Nerd"
- Description: "Discover Drake's social links and streaming profiles on Music Nerd."
- Image: Drake's Spotify profile photo

**Search engine results:**
- Title: "Drake | Music Nerd"
- Snippet: Artist bio text (crawlable in HTML)

**Page source (what crawlers see):**
```html
<title>Drake | Music Nerd</title>
<meta property="og:title" content="Drake | Music Nerd">
<meta property="og:image" content="https://i.scdn.co/image/...">
<div class="bio">Drake is a Canadian rapper and singer...</div>
```

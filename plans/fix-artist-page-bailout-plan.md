# Fix Artist Page BAILOUT_TO_CLIENT_SIDE_RENDERING Plan

## Status: READY FOR IMPLEMENTATION

**Goal:** Make artist pages fully crawlable by search engines and LLMs by ensuring artist metadata, bio, and social links render server-side without requiring client-side JavaScript.

**Decisions:**
- ✅ Edit functionality can be client-side only
- ✅ Bookmark button can be client-side only  
- ✅ Revalidation time: 3600 seconds (1 hour)
- ✅ Keep current edit mode behavior

---

## Problem Analysis

### Root Cause

The `BAILOUT_TO_CLIENT_SIDE_RENDERING` is triggered by **`getServerAuthSession()`** on line 69 of `src/app/artist/[id]/page.tsx`.

**Why this causes bailout:**
1. `getServerAuthSession()` → `getServerSession()` → internally calls `cookies()` 
2. `cookies()` is a **dynamic function** in Next.js App Router
3. Any use of dynamic functions (`cookies()`, `headers()`, `searchParams`) forces the route to be **dynamic**
4. Dynamic routes cannot be statically generated, causing Next.js to bail out to client-side rendering

### Current Impact

- ✅ Meta tags render in HTML (crawlable)
- ✅ SEO links (`SeoArtistLinks`) render in HTML (crawlable)  
- ❌ Artist bio is in RSC payload (requires JS)
- ❌ Social links are in RSC payload (requires JS)
- ❌ Artist name/image/details are in RSC payload (requires JS)

### Session Usage Analysis

Session is currently used for:
1. **`canEdit` flag** - Determines if user can edit (admin check)
2. **`BookmarkButton`** - Only shown if `session` exists
3. **`ArtistLinks`** - Receives `session` prop (but may not need it server-side)
4. **`EditModeToggle`** - Only shown if `canEdit` is true

**Key Insight:** Session is NOT required for rendering the core crawlable content (bio, links, metadata). It's only needed for interactive features.

---

## Solution Strategy

### Approach: Move Session to Client Components

1. **Remove session dependency from server component** - No `getServerAuthSession()` calls
2. **Move session-dependent UI to client components** - Fetch session client-side where needed
3. **Add route segment config** - Enable static generation with ISR
4. **Ensure core content renders without session** - Bio, links, metadata should be server-rendered HTML

---

## Implementation Plan

### Phase 4: Move Session to Client Components (IMPLEMENT THIS)

**Strategy:** Remove session dependency from server component entirely. Fetch session client-side where needed. This is the cleanest solution that enables static generation.

**Files to modify:**

#### 4.1: Create `ClientSessionWrapper` component

**New file:** `src/app/artist/[id]/_components/ClientSessionWrapper.tsx`

**Purpose:** Handle all session-dependent features client-side, maintaining current edit mode behavior. Provides session context to child components.

```typescript
"use client";

import { useSession } from "next-auth/react";
import { ReactNode, useState, useEffect, createContext, useContext } from "react";
import { EditModeProvider } from "@/app/_components/EditModeContext";

// Context to share session and canEdit state with child components
interface SessionContextType {
  session: ReturnType<typeof useSession>['data'];
  canEdit: boolean;
  isLoading: boolean;
}

const SessionContext = createContext<SessionContextType>({
  session: null,
  canEdit: false,
  isLoading: true,
});

// Hook to access session context
export function useSessionContext() {
  return useContext(SessionContext);
}

interface ClientSessionWrapperProps {
  children: ReactNode;
}

export default function ClientSessionWrapper({
  children,
}: ClientSessionWrapperProps) {
  const { data: session, status } = useSession();
  const [canEdit, setCanEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Determine canEdit - check if user is admin (maintains current behavior)
  useEffect(() => {
    if (status === "loading") {
      setIsLoading(true);
      return;
    }

    setIsLoading(false);

    if (session?.user?.id) {
      // Fetch user to check admin status (same logic as server-side)
      fetch(`/api/user/${session.user.id}`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Failed to fetch user');
          }
          return res.json();
        })
        .then(user => {
          setCanEdit(user?.isAdmin ?? false);
        })
        .catch((error) => {
          console.error('[ClientSessionWrapper] Error fetching user:', error);
          setCanEdit(false);
        });
    } else {
      // Check for walletless mode (same as server-side logic)
      const walletlessEnabled = process.env.NEXT_PUBLIC_DISABLE_WALLET_REQUIREMENT === 'true' && 
                                 process.env.NODE_ENV !== 'production';
      setCanEdit(walletlessEnabled);
    }
  }, [session, status]);

  return (
    <SessionContext.Provider value={{ session, canEdit, isLoading }}>
      <EditModeProvider canEdit={canEdit}>
        {children}
      </EditModeProvider>
    </SessionContext.Provider>
  );
}
```

#### 4.1b: Create `SessionDependentButtons` component

**New file:** `src/app/artist/[id]/_components/SessionDependentButtons.tsx`

**Purpose:** Renders bookmark button and edit toggle based on session context.

```typescript
"use client";

import BookmarkButton from "@/app/_components/BookmarkButton";
import EditModeToggle from "@/app/_components/EditModeToggle";
import { useSessionContext } from "./ClientSessionWrapper";

interface SessionDependentButtonsProps {
  artistId: string;
  artistName: string;
  imageUrl: string;
}

export default function SessionDependentButtons({
  artistId,
  artistName,
  imageUrl,
}: SessionDependentButtonsProps) {
  const { session, canEdit, isLoading } = useSessionContext();

  if (isLoading) {
    return null; // Or a loading spinner
  }

  return (
    <div className="flex items-center gap-2">
      {session && (
        <BookmarkButton
          artistId={artistId}
          artistName={artistName}
          imageUrl={imageUrl}
          userId={session.user.id}
        />
      )}
      {canEdit && <EditModeToggle />}
    </div>
  );
}
```

#### 4.2: Update `page.tsx` to remove session dependency

**File:** `src/app/artist/[id]/page.tsx`

**Changes:**
1. Remove `getServerAuthSession()` import and call (line 8, 69)
2. Remove `getUserById` import and call (line 2, 73)
3. Remove session-dependent logic (lines 69-79)
4. Remove `EditModeProvider` wrapper (line 96) - replace with `ClientSessionWrapper`
5. Remove `AutoRefresh` component (line 97) - keep it but move inside wrapper if needed
6. Remove `BookmarkButton` and `EditModeToggle` from server component (lines 116-124)
7. Pass `canEdit={false}` and `session={null}` to `ArtistLinks` components
8. Wrap entire page content in `ClientSessionWrapper` to maintain edit mode context
9. Keep core crawlable content (bio, links, metadata) server-rendered

**Key Changes:**
- Remove all `getServerAuthSession()` calls
- Remove all session-dependent conditional rendering
- `canEdit` always `false` server-side (edit features handled client-side)
- `session` always `null` server-side (passed to components that accept it)
- Wrap entire content in `ClientSessionWrapper` to provide `EditModeContext`

**Structure:**
```typescript
return (
    <>
        <ClientSessionWrapper>
            <AutoRefresh sessionStorageKey="artistSkipReload" showLoading={false} />
            <div className="gap-4 px-4 flex flex-col md:flex-row max-w-[1000px] mx-auto">
                {/* Artist Info Box */}
                <div className="...">
                    <div className="mb-2 flex items-center justify-between">
                        <strong className="text-black text-2xl mr-2">
                            {artist.name}
                        </strong>
                        <SessionDependentButtons 
                            artistId={artist.id}
                            artistName={artist.name ?? ''}
                            imageUrl={spotifyImg.artistImage ?? ''}
                        />
                    </div>
                    {/* Rest of content */}
                </div>
            </div>
        </ClientSessionWrapper>
        <SeoArtistLinks artist={artist} />
    </>
);
```

**Note:** `SessionDependentButtons` will be a client component that uses the session context from `ClientSessionWrapper` to conditionally render bookmark and edit toggle buttons.

#### 4.3: Update `ArtistLinks` to handle null session

**File:** `src/app/_components/ArtistLinks.tsx`

**Changes:**
1. Make `session` prop optional/nullable
2. Handle null session gracefully (no edit features)

```typescript
export default async function ArtistLinks({
    isMonetized,
    artist,
    spotifyImg,
    session, // Can be null
    availableLinks,
    isOpenOnLoad = false,
    canEdit = false,
    showAddButton = true
}: {
    isMonetized: boolean;
    artist: Artist;
    spotifyImg: string;
    session: Session | null; // Changed to nullable
    availableLinks: UrlMap[];
    isOpenOnLoad: boolean;
    canEdit?: boolean;
    showAddButton?: boolean;
}) {
    // ... existing code
    // canEdit will be false if session is null, which is correct
}
```

---

### Phase 5: Add Route Segment Config (Final Step)

**File:** `src/app/artist/[id]/page.tsx`

**Add after imports, before `generateMetadata`:**
```typescript
// Enable static generation with ISR
// Since we removed getServerAuthSession() (which uses cookies()), 
// Next.js can now statically generate these pages
export const dynamic = 'auto'; // Let Next.js decide, but prefer static
export const revalidate = 3600; // Revalidate every hour (ISR)
```

**Why `dynamic = 'auto'`:**
- Next.js will attempt static generation
- Falls back to dynamic only if dynamic functions are detected
- Since we removed `cookies()` call, it should be static
- `revalidate = 3600` enables ISR with 1-hour revalidation (as specified)

---

## Implementation Decisions (CONFIRMED)

1. ✅ **Edit functionality:** Client-side only - Phase 4 approach approved
2. ✅ **Bookmark button:** Client-side only - acceptable  
3. ✅ **Revalidation time:** 3600 seconds (1 hour) - confirmed
4. ✅ **Edit mode behavior:** Keep current behavior - maintain existing UX

---

## Implementation Order (FINAL)

**Proceed with these phases in order:**

1. ✅ **Phase 4.1** - Create `ClientSessionWrapper` component
2. ✅ **Phase 4.1b** - Create `SessionDependentButtons` component
3. ✅ **Phase 4.2** - Update `page.tsx` to remove session dependency  
4. ✅ **Phase 4.3** - Update `ArtistLinks` to handle null session
5. ✅ **Phase 5** - Add route segment config (`dynamic` and `revalidate`)
6. ✅ **Testing** - Verify static generation and crawlability

---

## Testing Plan

### 1. Verify Static Generation

```bash
# Build the app
npm run build

# Check build output for artist pages
# Should see: "○ Static" or "● SSG" for artist/[id] routes
```

### 2. Verify HTML Output

```bash
# Fetch page as crawler
curl -A "Googlebot" https://www.musicnerd.xyz/artist/[id] > output.html

# Check for:
# ✅ Artist name in HTML (not just RSC payload)
# ✅ Bio text in HTML
# ✅ Social links as <a> tags in HTML
# ✅ No BAILOUT_TO_CLIENT_SIDE_RENDERING template
```

### 3. Verify Crawlability

- Use Google Search Console URL Inspection
- Use SEO tools (Screaming Frog, etc.)
- Check that content is visible without JavaScript

### 4. Verify Functionality

- ✅ Bookmark button still works (client-side)
- ✅ Edit mode still works (client-side)
- ✅ Social links still work
- ✅ Page loads correctly

---

## Expected Outcome

After implementation:

- ✅ Artist pages are statically generated (or ISR)
- ✅ No `BAILOUT_TO_CLIENT_SIDE_RENDERING`
- ✅ Artist name, bio, links render in HTML
- ✅ Fully crawlable by search engines and LLMs
- ✅ Interactive features (bookmark, edit) still work client-side
- ✅ Better performance (static pages are faster)

---

## Files to Modify

### New Files
1. `src/app/artist/[id]/_components/ClientSessionWrapper.tsx` - NEW - Client session wrapper component with context
2. `src/app/artist/[id]/_components/SessionDependentButtons.tsx` - NEW - Component that renders bookmark/edit buttons using session context

### Modified Files
3. `src/app/artist/[id]/page.tsx` - Remove session dependency, add route config, wrap in ClientSessionWrapper
4. `src/app/_components/ArtistLinks.tsx` - Make session prop nullable (Session | null)

### No Changes Needed
5. `src/app/_components/BookmarkButton.tsx` - Already client-side, works as-is
6. `src/app/_components/EditModeToggle.tsx` - Already client-side, works as-is
7. `src/app/_components/EditModeContext.tsx` - Already client-side, works as-is
8. `src/app/_components/EditablePlatformLink.tsx` - Already uses EditModeContext, works as-is

---

## Implementation Checklist

- [ ] Create `ClientSessionWrapper.tsx` component with session context
- [ ] Create `SessionDependentButtons.tsx` component
- [ ] Update `page.tsx` imports: remove `getServerAuthSession`, `getUserById`; add `ClientSessionWrapper`, `SessionDependentButtons`
- [ ] Update `page.tsx` to remove `getServerAuthSession()` call (line 69)
- [ ] Update `page.tsx` to remove session-dependent logic (lines 69-79)
- [ ] Update `page.tsx` to remove `EditModeProvider` wrapper (replace with `ClientSessionWrapper`)
- [ ] Update `page.tsx` to replace bookmark/edit buttons with `SessionDependentButtons` component
- [ ] Update `page.tsx` to pass `canEdit={false}` and `session={null}` to `ArtistLinks` components
- [ ] Update `page.tsx` to add route segment config (`dynamic`, `revalidate`) after imports
- [ ] Update `ArtistLinks.tsx` to accept `Session | null` (make session prop nullable)
- [ ] Test build: `npm run build` - verify artist pages show as "○ Static" or "● SSG"
- [ ] Test HTML output: `curl` page and verify content is in HTML, not just RSC payload
- [ ] Test functionality: bookmark button works, edit mode works, links work
- [ ] Verify no `BAILOUT_TO_CLIENT_SIDE_RENDERING` template tag in HTML

---

## Rollback Plan

If issues arise:
1. Revert `page.tsx` changes
2. Keep `ClientSessionWrapper` and `SessionDependentButtons` for future use
3. Session-dependent features will work as before

---

## Timeline Estimate

- Phase 4.1 (ClientSessionWrapper): 30 minutes
- Phase 4.1b (SessionDependentButtons): 15 minutes
- Phase 4.2 (page.tsx refactor): 1-1.5 hours
- Phase 4.3 (ArtistLinks update): 15 minutes
- Phase 5 (route config): 5 minutes
- Testing & verification: 1 hour
- **Total: ~3-4 hours**

---

## Additional Notes

### Why This Approach Works

1. **No Dynamic Functions:** By removing `getServerAuthSession()` (which calls `cookies()`), we eliminate all dynamic function calls from the server component
2. **Static Generation:** Next.js can now statically generate the page during build time
3. **ISR:** With `revalidate = 3600`, pages are regenerated every hour, keeping content fresh
4. **Client-Side Features:** Interactive features (bookmark, edit) work client-side without affecting crawlability
5. **Context Pattern:** Using React context allows child components to access session state without prop drilling

### Potential Edge Cases

1. **Walletless Mode:** Handled in `ClientSessionWrapper` - checks environment variable
2. **Admin Check:** Fetches user data client-side via `/api/user/[id]` endpoint
3. **Loading States:** `isLoading` flag prevents flash of incorrect UI
4. **Error Handling:** Gracefully falls back to non-edit mode if user fetch fails

### Performance Considerations

- **Initial Load:** Static pages load faster (no server computation needed)
- **Client Hydration:** Session check happens client-side, doesn't block initial render
- **ISR:** Pages regenerate in background, users always see fast cached version
- **API Calls:** User admin check only happens when session exists (minimal overhead)


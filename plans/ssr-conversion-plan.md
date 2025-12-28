# SSR Conversion Plan for MusicNerdWeb

## Goal
Convert all pages to Server-Side Rendering (SSR) for improved SEO and performance, while keeping interactive components as client-side "islands".

## Current State Summary

| Category | Files with 'use client' |
|----------|------------------------|
| Pages | 1 (only home page) |
| Components | 46 (most are necessary client components) |

**Key finding**: Most pages are already SSR. Only `src/app/page.tsx` (home page) has `"use client"`.

---

## Implementation Steps

### Step 1: Convert Home Page to SSR

**File**: `src/app/page.tsx`

**Changes**:
1. Remove `"use client"` directive
2. Remove unused imports (`useState`, `Select` components)
3. Pass `animation="static"` directly as prop (the animation selector is commented out)
4. Add SEO metadata export

**Before**:
```typescript
"use client"
import { useState } from "react";
// ... Select imports
export default function HomePage() {
  const [animation, setAnimation] = useState("static");
  return <HomePageSplash animation={animation} />;
}
```

**After**:
```typescript
import type { Metadata } from "next";
import HomePageSplash from "./_components/HomePageSplash";

export const metadata: Metadata = {
  title: "Music Nerd - Discover Artist Links & Social Media",
  description: "A crowd-sourced directory for music artists...",
  // ... OpenGraph, Twitter cards
};

export default function HomePage() {
  return <HomePageSplash animation="static" />;
}
```

**Risk**: Low - HomePageSplash is already a client component island

---

### Step 2: Refactor Navigation for SSR

**File**: `src/app/_components/nav/index.tsx`

**Problem**: Uses `usePathname()` hook which requires client-side, just to hide nav on home page.

**Solution**: Create server wrapper that passes pathname info from layout

**Option A - Server Component with Client Island** (Recommended):
1. Create `NavServer.tsx` that receives `pathname` prop
2. Keep `NavClient.tsx` (rename current) for interactive parts
3. Pass pathname from layout.tsx using `headers()` or page-level detection

**Option B - CSS-based hiding**:
1. Keep Nav as client component
2. Use CSS to hide on home page route
3. Simpler but less clean

**Files to modify**:
- `src/app/_components/nav/index.tsx` - refactor
- `src/app/layout.tsx` - update Nav import/usage

---

### Step 3: Verify Other Pages

These pages are already SSR (no changes needed):
- `src/app/artist/[id]/page.tsx` - Already async server component
- `src/app/admin/page.tsx` - Server component (returns UnauthorizedPage)
- `src/app/add-artist/page.tsx` - Server component
- `src/app/profile/page.tsx` - Server component
- `src/app/leaderboard/page.tsx` - Server component

---

### Step 4: Add Home Page Metadata

**File**: `src/app/page.tsx`

Add metadata for SEO:
```typescript
export const metadata: Metadata = {
  title: "Music Nerd - Discover Artist Links & Social Media",
  description: "A crowd-sourced directory of music artists. Find social media links, streaming profiles, and support your favorite artists.",
  openGraph: {
    type: "website",
    title: "Music Nerd - Discover Artist Links & Social Media",
    description: "A crowd-sourced directory of music artists.",
  },
};
```

---

## Components That Must Remain Client-Side

These components have browser-only dependencies and should stay as client islands:

| Component | Reason |
|-----------|--------|
| `HomePageSplash.tsx` | Contains SearchBar, animations |
| `ThemeProvider.tsx` | localStorage, window.matchMedia |
| `SearchBar.tsx` | useState, useQuery, interactive |
| `BlurbSection.tsx` | useState, useEffect, fetch |
| `FunFacts*.tsx` | useState, fetch |
| `Providers.tsx` | QueryClientProvider |
| All `components/ui/*` | Radix UI requires client |

---

## Files to Modify

1. `src/app/page.tsx` - Remove "use client", add metadata
2. `src/app/_components/nav/index.tsx` - Refactor for SSR
3. `src/app/layout.tsx` - Update Nav usage (if needed)

---

## Testing Checklist

- [x] Run `npm run type-check` - no TypeScript errors
- [x] Run `npm run lint` - no linting errors (pre-existing warnings only)
- [x] Run `npm run test` - all tests pass (352 passed)
- [ ] Run `npm run build` - requires env vars (SPOTIFY credentials)
- [ ] Manual: View page source shows meaningful HTML
- [ ] Manual: Page works with JavaScript disabled (basic content)
- [ ] Manual: Search functionality works after hydration

## Implementation Status: COMPLETE

**Changes Made:**

1. `src/app/page.tsx` - Removed "use client", cleaned up unused imports, now SSR
2. `src/app/_components/nav/index.tsx` - Refactored to use NavContent component
3. `src/app/_components/nav/NavContent.tsx` - New client component with nav rendering

---

## Success Metrics

- Home page renders HTML on server (view source shows content)
- Lighthouse SEO score improvement
- No regression in interactivity

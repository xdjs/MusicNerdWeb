# MusicNerdWeb - Claude AI Assistant Guide

## Project Overview
MusicNerdWeb is a Next.js web application that serves as a crowd-sourced directory for music artists. It enables users to discover artists, manage artist data, and explore social media/platform connections across the music ecosystem.

## Tech Stack
- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: Privy (email-first) with NextAuth.js CredentialsProvider
- **Styling**: Tailwind CSS + SCSS
- **UI Components**: Radix UI primitives + custom components
- **Web3**: Privy SDK handles wallet signature verification for optional wallet linking (legacy account migration)
- **AI Integration**: OpenAI API for artist bios and fun facts
- **Testing**: Jest 30 with React Testing Library
- **State Management**: React Query (@tanstack/react-query)

## Key Features
1. **Artist Discovery & Search**: Search artists with combined local database and Spotify API results
2. **Social Media Aggregation**: Collect and display artist links from 40+ platforms
3. **Authentication**: Privy email-first login with optional wallet linking for legacy accounts
4. **AI-Powered Content**: Auto-generated artist biographies and fun facts
5. **User-Generated Content (UGC)**: Community-driven artist data collection with admin moderation
6. **Leaderboard System**: Track user contributions and rankings
7. **Admin Dashboard**: Manage users, whitelist contributors, and moderate UGC
8. **Spotify Integration**: Rich artist data, images, and music embeds

## Project Structure
```
src/
├── app/                          # Next.js app router pages
│   ├── _components/             # Global shared components
│   ├── api/                     # API route handlers
│   ├── artist/[id]/             # Dynamic artist pages
│   ├── admin/                   # Admin dashboard
│   ├── profile/                 # User profile pages
│   └── add-artist/              # Artist addition flow
├── components/ui/               # Reusable UI components (Radix-based)
├── server/                      # Server-side utilities
│   ├── auth.ts                  # NextAuth configuration
│   ├── db/                      # Database schema and client
│   └── utils/                   # Server utilities and queries
├── hooks/                       # Custom React hooks
├── lib/                         # Client-side utilities
└── types/                       # TypeScript type definitions
```

## Database Schema
Key entities in the PostgreSQL database:

### Core Tables
- **users**: User accounts with wallet addresses, admin/whitelist status
- **artists**: Main artist records with social media links and metadata
- **ugcresearch**: User-generated content submissions pending approval
- **urlmap**: Platform configuration and URL patterns for link validation
- **featured**: Featured artists and collectors
- **aiPrompts**: AI prompt templates for content generation
- **funFacts**: AI-generated fun facts about artists

### Important Relationships
- Artists are linked to users via `addedBy` (foreign key to users.id)
- UGC submissions reference both artist and user
- Platform links are validated against urlmap regex patterns

## Authentication System
- **Privy Email-First**: Users authenticate via Privy (email login as primary method)
- **NextAuth Integration**: CredentialsProvider named "privy" verifies Privy tokens
- **Token Formats**: Standard access token, `idtoken:` prefix, `privyid:` prefix (dev only)
- **Legacy Account Migration**: Lazy, user-initiated via `needsLegacyLink` session flag + `LegacyAccountModal`
- **Wallet Linking**: Optional — legacy wallet users can link their wallet to a Privy account via `mergeAccounts()`
- **Role-Based Access**: Admin and whitelist user roles
- **Session Management**: JWT-based sessions with 30-day expiry

## Rate Limiting Middleware
API rate limiting is implemented in `src/middleware.ts` (in-memory, applied to all `/api/*` except `/api/auth/*`):
- **Strict** (5 req/min): `/api/funFacts`, `/api/artistBio`
- **Medium** (20 req/min): `/api/validateLink`
- **Default** (60 req/min): all other API routes
- Limits are configurable via `RATE_LIMIT_STRICT`, `RATE_LIMIT_MEDIUM`, `RATE_LIMIT_DEFAULT`, and `RATE_LIMIT_WINDOW_MS` env vars
- In-memory storage resets on serverless cold starts and is not shared across workers — best-effort protection

## Auth Guard Helpers
`src/lib/auth-helpers.ts` provides reusable server-side guards for API routes:
- `requireAuth()` — returns 401 if not authenticated
- `requireAdmin()` — returns 401/403; does a real-time DB lookup to verify admin role
- `requireWhitelistedOrAdmin()` — returns 401/403 for neither role

Use these when writing new API endpoints that need auth/role checks.

## API Endpoints
Key API routes in `src/app/api/`:
- `/searchArtists` - Artist search with Spotify integration
- `/validateLink` - Platform link validation
- `/artistBio/[id]` - AI-generated artist biographies
- `/funFacts/[type]` - AI-generated fun facts
- `/leaderboard` - User contribution rankings
- `/admin/*` - Admin management endpoints
- `/auth/*` - Privy authentication routes
- `/mcp/*` - MCP server for exposing artist data to AI assistants
- `/user` - User profile and wallet operations

### API Route Conventions
- **Performance logging**: Routes wrap handler bodies in `performance.now()` and log duration via `console.debug`
- **Timeout races**: AI routes use `Promise.race` with timeouts — `artistBio` 25s, `funFacts` 20s, `searchArtists` 12s
- **In-memory caching**: `searchArtists` and `searchArtists/batch` use a 5-minute TTL cache (same serverless caveat as rate limiting)
- **Error format**: Routes return `{ error: "message" }` (inconsistent in some older routes as `{ status, message }`)

## Server Actions
`src/app/actions/` contains Next.js Server Actions (all marked `"use server"`). These are thin wrappers — all business logic lives in `src/server/utils/queries/`.

## Coding Conventions

### Style
- **Package manager**: `npm` (not bun/yarn/pnpm — ignore the `bun.lockb` file)
- **Node version**: 20
- **Indentation**: Mixed across the codebase (2 and 4 spaces). Match the file you're editing.
- **Path alias**: `@/` → `src/`. Use `@/` for cross-module imports; relative paths for same-feature-folder imports.
- **Env vars in server code**: Import from `@/env`, never use `process.env` directly. In test env (`NODE_ENV=test`), validation returns `'test-value'` so tests run without `.env.local`.

### Components
- Components are **Server Components by default** (Next.js App Router). Add `"use client"` as the first line when using hooks, event handlers, or browser APIs.
- Server components call `getServerAuthSession()` from `@/server/auth`. Client components use `useSession()` from `next-auth/react`.
- Use `cn()` from `@/lib/utils` for Tailwind class merging.

### API Routes
- Dynamic params are a `Promise` in Next.js 15: `{ params }: { params: Promise<{ id: string }> }` — always `await params`.
- Add `export const dynamic = "force-dynamic"` to routes that read from the database, or Next.js may statically cache the response at build time.
- Named exports for HTTP methods (`GET`, `POST`, etc.) — no default export.

## Writing Tests
Tests use Jest 30 with JSDOM. The test infrastructure has significant boilerplate — follow these patterns exactly.

### API Route Test Template
```typescript
// @ts-nocheck
import { jest } from '@jest/globals';

// Mock dependencies BEFORE dynamic imports
jest.mock('@/lib/auth-helpers', () => ({ requireAuth: jest.fn() }));
jest.mock('@/server/utils/queries/someQueries', () => ({ myQuery: jest.fn() }));

// Polyfill Response.json (JSDOM doesn't have it)
if (!('json' in Response)) {
  Response.json = (data, init) =>
    new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
      status: init?.status || 200,
    });
}

describe('GET /api/example', () => {
  beforeEach(() => { jest.resetModules(); });

  async function setup() {
    const { requireAuth } = await import('@/lib/auth-helpers');
    const { GET } = await import('../route');
    return { GET, mockRequireAuth: requireAuth as jest.Mock };
  }

  // For dynamic routes, params must be a Promise:
  // { params: Promise.resolve({ id: 'some-id' }) }
});
```

### Key testing facts
- **File location**: API route tests go in `__tests__/` subdirectory co-located with the route (e.g. `src/app/api/user/[id]/__tests__/route.test.ts`). Shared utility tests go in `src/__tests__/` or `src/lib/__tests__/`.
- **Global mocks** (already set up in `jest.setup.ts` — don't re-mock these):
  - `@/server/db/drizzle` (db object with query.urlmap/artists/users/ugcresearch)
  - `openai` (returns `'mocked response'`)
  - `@/app/actions/serverActions` (all server actions)
  - `next/router`, `next/navigation`, `global.fetch`, `window.matchMedia`
- **`jest.resetModules()` + dynamic imports** are required for API route tests so mocks apply before the route module loads
- **Test timeout**: 20 seconds

## Development Workflow

### Available Scripts
```bash
npm run dev          # Start development server with HTTPS
npm run build        # Production build
npm run test         # Run Jest tests
npm run test:coverage # Test coverage report
npm run lint         # ESLint
npm run type-check   # TypeScript checking
npm run ci           # Full CI pipeline (type-check + lint + test + build)
```

### Database Commands
```bash
npm run db:generate  # Generate Drizzle migrations
npm run db:push     # Push schema to database
npm run db:migrate  # Run migrations
npm run db:studio   # Open Drizzle Studio
```

### Environment Variables
Required in `.env.local`:
- `SUPABASE_DB_CONNECTION` - PostgreSQL connection string
- `NEXT_PUBLIC_SPOTIFY_WEB_CLIENT_ID/SECRET` - Spotify API credentials
- `NEXTAUTH_URL/SECRET` - NextAuth configuration
- `NEXT_PUBLIC_PRIVY_APP_ID` / `PRIVY_APP_SECRET` - Privy client and server credentials
- `OPENAI_API_KEY` - For AI features
- `DISCORD_WEBHOOK_URL` - UGC notifications

Optional (in `.env.local`):
- `OPENAI_TIMEOUT_MS` (default 60000ms) / `OPENAI_MODEL` - OpenAI config overrides
- `RATE_LIMIT_STRICT` / `RATE_LIMIT_MEDIUM` / `RATE_LIMIT_DEFAULT` / `RATE_LIMIT_WINDOW_MS` - Rate limit tuning
- `NEXT_PUBLIC_ALLOWED_ORIGIN` (default `"*"`) - CORS origin for select API routes (read via `process.env`, not `@/env`)
- `TIMEOUT_COUNT` (default 900s) - Discord UGC notification cooldown (read via `process.env`, not `@/env`)

CI-only (GitHub Actions secrets, not set locally):
- `DISCORD_COVERAGE_URL` - Webhook for CI coverage reports

Environment variables are validated via `src/env.ts` — review before adding new ones.

## Key Components

### Artist Management
- `src/app/artist/[id]/page.tsx` - Artist detail pages
- `src/app/_components/ArtistLinks.tsx` - Social media link display
- `src/server/utils/queries/artistQueries.ts` - Database queries

### Authentication Flow
- `src/server/auth.ts` - NextAuth configuration with Privy CredentialsProvider
- `src/app/_components/nav/components/Login.tsx` - Login UI wrapper
- `src/app/_components/nav/components/PrivyLogin.tsx` - Privy login component
- `src/app/_components/PrivyProviderWrapper.tsx` - Privy context provider
- `src/server/utils/privy.ts` - Privy token verification utilities

### Search Functionality
- `src/app/_components/nav/components/SearchBar.tsx` - Search interface
- `src/app/api/searchArtists/route.ts` - Combined DB + Spotify search

## Git Workflow
- **Branching**: Feature branches off `staging` → PR to `staging` → PR from `staging` to `main`
- **Branch naming**: `username/feature-name` (e.g. `clt/new-endpoint`, `Piper/darkmode`)
- **Commit messages**: Conventional commits — `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `revert:`
- **PRs always target `staging`**, never `main` directly
- **Before pushing**: Run all checks and fix any failures:
  ```bash
  npm run type-check && npm run lint && npm run test && npm run build
  ```
  Note: `npm run test` works without `.env.local` (env vars fall back to `'test-value'` when `NODE_ENV=test`), but `npm run build` requires `.env.local` or the build will throw. If no `.env.local` exists, stub one with the minimum required vars:
  ```bash
  printf 'NEXT_PUBLIC_SPOTIFY_WEB_CLIENT_ID=stub\nNEXT_PUBLIC_SPOTIFY_WEB_CLIENT_SECRET=stub\nOPENAI_API_KEY=stub\n' > .env.local
  ```
  These three are the only vars that throw on missing values (see `src/env.ts`). All others default to `""`.
- **CI**: GitHub Actions automatically runs the same checks (type-check → lint → test → build) on every push and PR

## Important Notes for Claude
1. **Database First**: Most data operations go through Drizzle ORM queries. Import types from `@/server/db/DbTypes`, not from drizzle-orm directly.
2. **External Dependencies**: Heavy integration with Spotify API and OpenAI — these are mocked in tests.
3. **ESLint**: Flat config (`eslint.config.mjs`). `@typescript-eslint/no-explicit-any` and `@typescript-eslint/ban-ts-comment` are warnings, not errors. Test files have these rules disabled entirely.

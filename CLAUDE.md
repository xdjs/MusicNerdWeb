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
- `NEXT_PUBLIC_PRIVY_APP_ID` - Privy application ID
- `OPENAI_API_KEY` - For AI features
- `DISCORD_WEBHOOK_URL` - UGC notifications

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

## Testing Strategy
- **Unit Tests**: Component and utility testing with Jest
- **API Tests**: Route handler testing
- **Coverage**: Comprehensive test coverage reporting
- **CI/CD**: GitHub Actions with automated testing

## Code Quality Tools
- **ESLint**: Code linting with Next.js config
- **TypeScript**: Strict type checking
- **Coverage Reports**: Jest coverage with Discord notifications

## Important Notes for Claude
1. **Auth Context**: Email-first authentication via Privy; wallet linking is optional for legacy accounts
2. **Role-Based Features**: Many features require admin or whitelist privileges
3. **External Dependencies**: Heavy integration with Spotify API and OpenAI
4. **Database First**: Most data operations go through Drizzle ORM queries
5. **Type Safety**: Strict TypeScript usage throughout the codebase
6. **Pre-Push Gate**: Before pushing any code to origin, run `npm run type-check && npm run lint && npm run test && npm run build` locally. All checks must pass and any failures must be fixed before pushing.
7. **Environment Dependent**: Many features require proper env variable configuration

## Recent Development Focus
Based on git history, recent work includes:
- Privy email-first authentication migration (replacing legacy Web3-only login)
- Legacy account linking and wallet merge flow
- MCP server for exposing artist data to AI assistants
- SSR conversion and SEO improvements
- Security vulnerability fixes

## Commands to Run After Changes
```bash
npm run type-check && npm run lint && npm run test && npm run build
```
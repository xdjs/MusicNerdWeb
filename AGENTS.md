# Repository Guidelines

This repository is a Next.js (App Router) app written in TypeScript with Jest for testing. Keep changes small, typed, and well-tested.

## Project Structure & Modules
- `src/app/`: Routes, layouts, server actions, API routes.
- `src/components/`: Shared UI; component files use PascalCase (e.g., `UserCard.tsx`).
- `src/lib/`, `src/hooks/`: Utilities and React hooks.
- `src/server/`: Server-only logic and DB access.
- `public/`: Static assets.
- `drizzle/`, `migration/`: SQL schema and migrations (Drizzle ORM).
- `src/__tests__/`, `src/lib/__tests__/`, `__mocks__/`: Tests and Jest mocks.
- Top-level config: `jest.config.ts`, `jest.setup.ts`, `tsconfig.json`, `next.config.mjs`.

## Build, Test, and Development
```bash
npm run dev         # Start Next.js locally (HTTPS enabled)
npm run build       # Compile production build
npm run start       # Serve production build
npm run lint        # ESLint (Next.js config)
npm run type-check  # TypeScript: no emit
npm test            # Jest test suite
npm run test:watch  # Jest watch mode
npm run test:coverage # Coverage report
```
Required before commits/PRs: `npm run build && npm run lint && npm run type-check && npm test`.

## Coding Style & Naming
- Language: TypeScript; 2-space indentation.
- Components: PascalCase files and exported names.
- Hooks: `useX` naming (e.g., `useAudioQueue`).
- Modules in `src/lib/` are lowercase/kebab or domain-based folders.
- Linting: `eslint-config-next`; fix warnings unless justified.

## Testing Guidelines
- Frameworks: Jest + Testing Library (`jest.setup.ts`).
- File names: `*.test.ts` / `*.test.tsx` near code or under `__tests__`.
- Mocks: use `__mocks__/` and `jest-fetch-mock` for network.
- Aim to cover new logic and edge cases; UI tests assert behavior, not implementation details.

## Commit & Pull Requests
- Commits: imperative, concise subject (e.g., "Add auth route guard"). Group related changes.
- PRs: include summary of key changes, screenshots for UI, any linked issues, and test commands/results. Ensure all checks pass.

## Security & Configuration
- Copy `env.example` to `.env.local` and fill values. Do not commit secrets.
- Environment is validated via `src/env.ts`. Review before adding new vars.
- Database: manage schema with Drizzle (`npm run db:generate`, `db:push`, `db:migrate`).

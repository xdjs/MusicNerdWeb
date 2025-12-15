# Privy Auth Migration — Implementation Plan

Status: Draft
Owners: Web App Team (Auth, Frontend, Backend)
Related docs: docs/privy_migration_prd.md, docs/authentication-analysis.md

## Objectives
- Replace wallet-first auth (SIWE/RainbowKit/Wagmi) with Privy email/passkey.
- Keep NextAuth as the session boundary via a custom Privy provider.
- Preserve existing roles/permissions; wallets become optional linkable credentials.
- Provide CTA-based soft migration and profile-based merge for legacy users.

## Decisions (Confirmed)
- Login methods: email/passkey only (no social SSO; do not surface embedded wallet during onboarding).
- User creation: create Music Nerd user immediately after first successful Privy login.
- Merge precedence: legacy/original user record survives; copy `privy_user_id` to legacy and delete/archive the placeholder; no FK reassignment in dependent tables.
- Admin tools: extend search/views to include `email` and `privy_user_id` in addition to optional `wallet`.
- Data model: make `users.wallet` nullable; keep unique constraint (Postgres allows multiple NULLs).
- Guest mode: remove development-only guest mode.
- Email verification: require Privy-verified email before creating a user.
- Deployment strategy: big bang cutover (no dual-run/flags).
- UX copy: use placeholder copy below; refine with Product as needed.

## Architecture Changes
- Identity: Privy handles email/passkey auth and wallet linking.
- Session: NextAuth consumes Privy identity (JWT/OIDC) and issues app JWT session.
- Data: Add `privy_user_id TEXT UNIQUE` to `users`; make `wallet` nullable; keep role flags.
- Flows: Post-login CTA to link wallet when no mapped user; profile affordance to merge later.
- Removal: Eliminate SIWE endpoints, RainbowKit/Wagmi usage, and wallet-login UI.

## Workstreams
1) Database & Data Model
2) Auth & Session (NextAuth + Privy)
3) Wallet Linking & Merge Backend
4) Frontend Auth UX (Login, CTA, Profile)
5) Decommission Wallet Login (packages, providers, UI)
6) Configuration, Env Validation, Secrets
7) Tests, Mocks, and Tooling
8) Rollout, Telemetry, and Docs

---

## 1) Database & Data Model
- Add column: `users.privy_user_id TEXT UNIQUE`.
- Make `users.wallet` nullable (retain unique index). New users may have no wallet.
- Keep role flags: `isAdmin`, `isWhiteListed`, `isSuperAdmin`, `isHidden`.
- Add helper indexes if needed: `users(email)`, `users(username)` for admin tools.
- Drizzle schema updates in `src/server/db/schema.ts` + SQL migration files.
- Write idempotent migration to add column, update constraints, and backfill nothing initially.

Tasks
- Create Drizzle migration: add `privy_user_id` (unique), alter `wallet` to nullable.
- Update Drizzle schema types and regenerate.
- Update query helpers to support lookup by `privy_user_id` in addition to `wallet`.
- Audit code for non-null wallet assumptions; update types and null checks.

Acceptance
- Migrations run cleanly on dev/staging.
- New user rows can be created with `privy_user_id` only (no wallet).

---

## 2) Auth & Session (NextAuth + Privy)
- Replace Credentials/SIWE provider with a custom Privy provider.
- Verify Privy-issued identity token server-side; create/find user by `privy_user_id`.
- Maintain current JWT session shape and 5-minute role refresh behavior.
- Remove SIWE-specific CSRF/nonce handling.

Tasks
- Add Privy SDK and server verification utilities.
- Implement NextAuth provider that:
  - Validates Privy session/token on authorize or via OIDC callback.
  - Maps to user by `privy_user_id`; creates new user if none exists.
  - Copies role flags into JWT; retain `lastRefresh` logic from `docs/authentication-analysis.md`.
  - Enforces email verification: only proceed if Privy marks the email as verified.
- Update `src/server/auth.ts` callbacks to read from `privy_user_id` path instead of wallet.
- Add a server-side helper `getUserByPrivyId(privyUserId)`.
- Remove development-only guest mode and any related env gates or code paths.

Acceptance
- Email/passkey login via Privy yields a valid NextAuth session.
- Role flags in session stay current with 5-minute refresh.

---

## 3) Wallet Linking & Merge Backend
- Post-login wallet linking associates a wallet with the logged-in Privy user.
- If a legacy record exists for that wallet, perform merge: legacy survives, `privy_user_id` copied, placeholder new record archived/deleted.
- Ensure invariant that placeholders do not own persisted dependent data; block merge and log for manual remediation if unexpected dependents exist.

Tasks
- Add API route(s) or server actions:
  - `POST /api/account/link-wallet` — Requires active Privy session; verifies wallet via Privy linking; persists wallet on the current user; if a legacy user exists for that wallet, merge.
  - Optional: `POST /api/account/merge-legacy` — Explicit merge endpoint if needed.
- Implement merge service:
  - Input: `currentUserId`, `legacyWallet`.
  - Find legacy user by `wallet`.
  - If found and different from `currentUserId`: copy `privy_user_id` to legacy; archive/delete placeholder; return surviving user. Do not reassign dependent rows.
  - Use a transaction; ensure deterministic conflict resolution for usernames/emails.
- Add audit logging for merges (who, when, from → to IDs).

Acceptance
- Linking a wallet with a matching legacy record merges correctly and preserves roles/UGC.
- Linking a non-matching wallet simply attaches it to the current account.

---

## 4) Frontend Auth UX (Login, CTA, Profile)
- Replace wallet login UI with Privy login (email/passkey).
- Universal CTA after Privy login when no mapped user exists: “Have an existing wallet-based account? Connect your wallet to link.”
- Profile page affordance: “Merge a legacy wallet-based account.”
- Wallet linking uses Privy’s linking modal; no wallet-based login.

Tasks
- Replace `Login` and `LoginProviders` with Privy components (client-only where needed).
- Add a lightweight Post-Login Gate component that detects “no mapped Music Nerd record” and shows CTA.
- Implement profile page section with wallet-linking button and explanatory copy.
- Remove ENS/avatar dependencies if no wallet; keep graceful fallback (default avatar) and retain ENS for users who link.
- Update leaderboard/profile displays to tolerate missing wallet.

Placeholder UX copy (to refine with Product):
- Post-login CTA title: "Link your wallet to restore your Music Nerd account"
- Post-login CTA body: "Used a wallet to sign in before? Connect it now to link your old account. If you're new here, you can safely skip this."
- CTA actions: "Connect wallet" (primary), "Skip for now" (secondary)
- Profile merge title: "Merge a legacy wallet-based account"
- Profile merge body: "If you previously signed in with a wallet, connect it to merge and restore your history."
- Profile action: "Connect wallet"

Acceptance
- New users: login works; CTA appears only if no Music Nerd record.
- Legacy users: can link via CTA or later from profile and see restored data.

---

## 5) Decommission Wallet Login (packages, providers, UI)
- Remove RainbowKit, Wagmi, SIWE flows and endpoints.
- Remove wallet-connected auto-logout logic and wallet storage cleanup.

Tasks
- Delete SIWE authorize code and nonce handling.
- Remove `@rainbow-me/rainbowkit`, `wagmi`, `@rainbow-me/rainbowkit-siwe-next-auth`, and `siwe` references.
- Replace `LoginProviders` with a simple app provider (no wallet context).
- Purge wallet-only effects and helper code; update tests/mocks accordingly.
- Remove development-only guest mode toggles and related code paths.

Acceptance
- Build and type-check pass without wallet packages.
- App runs with Privy login only.

---

## 6) Configuration, Env Validation, Secrets
- Add Privy env vars to `env.example` and `src/env.ts` validation.
- Do not commit secrets; configure in Vercel/host.

Tasks
- Add: `PRIVY_APP_ID`, `PRIVY_PUBLIC_KEY`, `PRIVY_SECRET`, any domain/config required by Privy.
- Update `NEXTAUTH_URL` and NextAuth cookie settings unchanged.
- Document setup in README.
- Remove `NEXT_PUBLIC_DISABLE_WALLET_REQUIREMENT` and any guest-mode related envs.

Acceptance
- App fails fast with clear errors if Privy env vars missing.

---

## 7) Tests, Mocks, and Tooling
- Maintain Jest + Testing Library coverage for new logic and edge cases.

Tasks
- Unit tests:
  - NextAuth provider with Privy token verification (mock Privy SDK).
  - JWT callback role refresh (unchanged logic, new lookup by `privy_user_id`).
  - Merge service transactional behavior and edge cases (conflicts, already-linked).
- Integration tests:
  - New user login → record created.
  - Legacy user login → CTA shown → wallet link → merge performed.
  - Skip CTA → later merge from profile.
- Update `__mocks__/` for Privy client and server SDKs.
- Remove SIWE/RainbowKit/guest-mode mocks and tests.
- Add tests asserting that unverified Privy emails cannot create a user/session.

Acceptance
- `npm run build && npm run lint && npm run type-check && npm test` all pass.
- Coverage for new modules ≥ existing project baseline.

---

## 8) Rollout, Telemetry, and Docs
- Big bang cutover.

Tasks
- Prepare cutover plan and rollback notes.
- Monitoring: add lightweight logs/metrics for login, link, merge success/failure.
- Comms/Copy: ship finalized UX copy per PRD (“soft, explanatory, non-technical”).
- Clean-up phase: remove wallet packages and dead code after successful migration.
- Update docs: README auth section, admin playbooks for merges, troubleshooting.

Acceptance
- Staging validation complete, then one-time production cutover.
- Legacy users can recover accounts post-cutover without support intervention.

---

## Detailed Task Backlog

DB & Schema
- Add `privy_user_id` to `users` (unique) and make `wallet` nullable via Drizzle migration.
- Update `src/server/db/schema.ts` and regenerate types.
- Add `getUserByPrivyId`, `updateUserPrivyId`, and `linkWallet` helpers.

Auth/NextAuth
- Install Privy SDKs (client/server) and wire env vars.
- Implement Privy-backed NextAuth provider in `src/server/auth.ts`.
- Replace SIWE credentials provider; remove CSRF/nonce verification code.
- Keep JWT `session.strategy = 'jwt'` and 5-minute role refresh; switch lookup key from wallet → `privy_user_id`.

Linking & Merge
- Implement `/api/account/link-wallet` server action/route: verify Privy-linked wallet, write to DB, return merge result if applicable.
- Implement merge service with transaction and auditing.
- Decide placeholder user archival vs. hard delete; implement accordingly.

Frontend
- Replace `Login.tsx` UI to use Privy login button and session hooks.
- Replace `LoginProviders.tsx` with non-wallet provider; remove RainbowKit/Wagmi contexts.
- Build Post-Login CTA surface (banner or page section) when no mapped record exists.
- Add profile “Merge legacy account” section using Privy link flow.
- Update ENS/jazzicon usage to be resilient when no wallet is linked.

Cleanup
- Remove wallet-login code paths, SIWE messages, and storage cleanup logic.
- Remove rainbowkit/wagmi/siwe package imports and config.

Testing
- Add unit/integration tests for new flows.
- Update mocks; remove SIWE-specific tests.

Docs & Ops
- Update `env.example`, README, and internal runbooks.
- Add basic telemetry/logging around link/merge for observability.

---

## Risks & Mitigations
- Legacy users skip CTA and create a second account: profile-based merge path restores; add prominent copy.
- Incorrect merges: deterministic, transactional merge with audit logs; confirm wallet ownership via Privy.
- Confusion over optional wallets: clear copy; wallet never used for login.
- Package removal regressions: mitigate with thorough staging validation, smoke tests, and rollback plan.

---

## Resolved Clarifications
- Email/passkey only; do not show embedded wallet during onboarding.
- Create user immediately upon first Privy login.
- Legacy/original record survives merge; copy `privy_user_id`; delete/archive placeholder; no FK reassignment.
- Admin search/views will support `email` and `privy_user_id` in addition to optional `wallet`.
- Make `wallet` nullable and keep unique constraint.
- Remove guest mode.
- Require verified emails before user creation.
- Big bang deployment (no feature flags/dual-run).
- Placeholder UX copy included; refine with Product.

# JWT Bearer Token Authentication Plan

## Goal
Secure public API routes with short‑lived bearer tokens signed using the existing NextAuth JWT secret.

## Integration Notes
NextAuth already issues JWTs for sessions. We can reuse its `NEXTAUTH_SECRET` and helper utilities to sign and verify client tokens so that token handling stays consistent.

## Tasks
1. **Token issuance endpoint**
   - Create `/api/auth/client-token` that authenticates callers (e.g., via admin session or static provisioning key).
   - Use `next-auth/jwt` helpers to sign a JWT containing client identifier and expiration.
2. **Verification middleware**
   - Parse `Authorization: Bearer <token>` header.
   - Validate token signature and expiry with `next-auth/jwt`'s `getToken` or `jwtVerify` using `NEXTAUTH_SECRET`.
   - Attach decoded client info to request context.
3. **Protect OpenAI routes**
   - Wrap `funFacts`, `artistBio`, and other OpenAI routes with the middleware.
   - Deny access when token is invalid, expired, or missing.
4. **Revocation & logging**
   - Maintain allow‑list/deny‑list for issued tokens (e.g., DB table of token IDs or jti claims).
   - Log token usage for auditing and detect abuse.
5. **Client documentation**
   - Describe how to obtain tokens and include them in `Authorization` header.
   - Include expiry, renewal, and rotation guidance.

## Verification
- Unit tests for token issuance and verification logic.
- Integration tests ensuring protected routes reject requests without valid tokens.

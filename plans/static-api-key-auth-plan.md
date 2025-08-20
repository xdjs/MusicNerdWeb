# Static API Key Authentication Plan

## Goal
Protect public OpenAI-powered API routes by requiring clients to supply a valid static API key.

## Tasks
1. **Design key storage**
   - Decide on persistence: environment variable list for simple setups or new `api_keys` table with hashed keys for per-client management.
   - Provide utility script to generate keys and hashes.
2. **Create validation middleware**
   - Read `X-API-Key` header.
   - Compare hashed value against allow‑list.
   - Return `401 Unauthorized` when missing/invalid.
3. **Apply middleware to sensitive routes**
   - Wrap existing OpenAI routes such as `funFacts` and `artistBio`.
   - Ensure early exit before contacting OpenAI.
4. **Add rate limiting & logging hooks**
   - Track requests per API key.
   - Surface suspicious activity in logs.
5. **Document client usage**
   - Explain header format and rotation procedure.
   - Note that keys should be kept secret and rotated periodically.

## Verification
- Unit tests for middleware accepting/denying requests.
- Integration tests hitting protected routes with valid/invalid keys.

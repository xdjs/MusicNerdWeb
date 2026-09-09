# MCP reference

Checked against the local implementation on 2026-09-09. This describes the checkout, not a
live deployment check. The [original link-tool plan](mcp-artist-link-tools.md) is design history.

## Connection and authorization

The endpoint is `/api/mcp` on the chosen app origin, using stateless Streamable HTTP.
Use a compatible MCP client for protocol negotiation and tool calls. A normal GET returns
server metadata; it does not prove a tool or database operation works.

Read tools can be called without a key. Mutating tools require `Authorization: Bearer <key>`.
Create and revoke keys through Admin → MCP Keys; the raw secret is shown at creation and cannot
be retrieved afterward. Store it in private client configuration, never in the repository.

For POST requests, supplying an invalid or revoked key returns HTTP 401 even for a read call.
With no header, transport proceeds and each mutating tool rejects unauthenticated access.
These keys are separate from Privy login tokens and NextAuth sessions.

## Tools

| Access | Tools |
| --- | --- |
| Public reads | `search_artists`, `get_artist`, `get_unmapped_artists`, `get_mapping_stats`, `get_artist_mappings`, `get_mapping_exclusions` |
| Bearer-key writes | `set_artist_link`, `delete_artist_link`, `resolve_artist_id`, `exclude_artist_mapping` |

Get exact inputs from the server's `tools/list` response or the Zod schemas in
[server.ts](../src/app/api/mcp/server.ts). Identity-mapping tools support inputs and conflict
rules beyond the original single-item design; do not copy an old PRD as the current schema.

## Implementation and verification

- [route.ts](../src/app/api/mcp/route.ts): HTTP transport, POST authentication and request context.
- [auth.ts](../src/app/api/mcp/auth.ts): SHA-256 key lookup, revocation and `requireMcpAuth()`.
- [server.ts](../src/app/api/mcp/server.ts): registration, input schemas and tool behavior.
- [artistLinkService.ts](../src/server/utils/artistLinkService.ts) and
  [idMappingService.ts](../src/server/utils/idMappingService.ts): shared writes and conflict rules.
- [Tests](../src/app/api/mcp/__tests__/): auth, reads, mutations, conflicts and audit coverage.

Call `requireMcpAuth()` before database work in every new mutating tool. Reuse the shared write
services and retain audit behavior. Exercise success, absent/invalid/revoked credentials and
conflicts in the relevant tests. Live mutation checks need a known dev target and fixtures;
the old [E2E scenarios](mcp-e2e-test-plan.md) must be adapted to the current schema and target.

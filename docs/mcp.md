# MCP reference

The MCP server runs in [MusicNerdAPI](https://github.com/xdjs/MusicNerdAPI), not in this app
(moved in xdjs/MusicNerdAPI#75; the Web route was deleted for #1595). The
[original link-tool plan](mcp-artist-link-tools.md) is design history.

## Connection and authorization

| Environment | Endpoint |
| --- | --- |
| Production | `https://api.musicnerd.net/api/mcp` |
| Staging (staging database) | `https://musicnerd-api-staging.vercel.app/api/mcp` |

The server uses stateless Streamable HTTP. Use a compatible MCP client for protocol negotiation
and tool calls. A normal GET returns server metadata; it does not prove a tool or database
operation works. The [MCP docs pages](https://docs.musicnerd.net/api-reference/mcp/message)
have the request and response shapes.

Read tools can be called without a key. Mutating tools require `Authorization: Bearer <key>`.
Create and revoke keys through Admin → MCP Keys; the raw secret is shown at creation and cannot
be retrieved afterward. Store it in private client configuration, never in the repository.
For POST requests, an invalid or revoked key returns HTTP 401 even for a read call.
These keys are separate from Privy login tokens and NextAuth sessions.

## Tools

| Access | Tools |
| --- | --- |
| Public reads | `search_artists`, `get_artist`, `get_unmapped_artists`, `get_mapping_stats`, `get_artist_mappings`, `get_mapping_exclusions` |
| Bearer-key writes | `set_artist_link`, `delete_artist_link`, `resolve_artist_id`, `exclude_artist_mapping` |

Get exact inputs from the server's `tools/list` response or MusicNerdAPI's `lib/mcp/`.

## What stays in this repo

- [logMcpAudit.ts](../src/server/utils/logMcpAudit.ts): `logMcpAudit`, used by admin claim actions.
  Key hashing and validation live in MusicNerdAPI.

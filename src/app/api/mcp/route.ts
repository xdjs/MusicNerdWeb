import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { server } from "./server";

// Create a stateless transport for handling requests
// In stateless mode, each request is handled independently without session management
async function handleMcpRequest(req: Request): Promise<Response> {
  console.log(`[MCP] Incoming ${req.method} request`);

  const transport = new WebStandardStreamableHTTPServerTransport({
    // No sessionIdGenerator = stateless mode
    sessionIdGenerator: undefined,
  });

  // Connect the server to the transport
  await server.connect(transport);

  // Handle the request and return the response
  const response = await transport.handleRequest(req);

  return response;
}

/**
 * POST handler for MCP JSON-RPC requests
 * This is the main endpoint for MCP tool calls and protocol messages
 */
export async function POST(req: Request): Promise<Response> {
  const start = performance.now();

  try {
    console.log("[MCP] POST request received");
    const response = await handleMcpRequest(req);
    return response;
  } catch (error) {
    console.error("[MCP] POST error:", error);
    return new Response(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32603,
          message: "Internal server error",
        },
        id: null,
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } finally {
    const end = performance.now();
    console.log(`[MCP] POST took ${end - start}ms`);
  }
}

/**
 * GET handler for SSE streams and server info
 * Can be used for server-to-client notifications and health checks
 */
export async function GET(req: Request): Promise<Response> {
  const start = performance.now();

  try {
    console.log("[MCP] GET request received");

    // Check if this is an SSE request (Accept header contains text/event-stream)
    const acceptHeader = req.headers.get("Accept") ?? "";
    if (acceptHeader.includes("text/event-stream")) {
      // Handle SSE stream request
      const response = await handleMcpRequest(req);
      return response;
    }

    // Return server info for regular GET requests (health check)
    return new Response(
      JSON.stringify({
        name: "Music Nerd",
        version: "1.0.0",
        status: "ok",
        protocol: "mcp",
        transport: "streamable-http",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[MCP] GET error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } finally {
    const end = performance.now();
    console.log(`[MCP] GET took ${end - start}ms`);
  }
}

/**
 * DELETE handler for session termination
 * In stateless mode, this is a no-op but included for protocol compliance
 */
export async function DELETE(req: Request): Promise<Response> {
  console.log("[MCP] DELETE request received");

  try {
    // In stateless mode, DELETE is essentially a no-op
    // but we still process it through the transport for protocol compliance
    const response = await handleMcpRequest(req);
    return response;
  } catch (error) {
    console.error("[MCP] DELETE error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}

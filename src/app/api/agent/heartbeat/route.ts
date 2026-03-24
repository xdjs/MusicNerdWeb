import { validateMcpApiKey } from "@/app/api/mcp/auth";
import { upsertHeartbeat } from "@/server/utils/queries/heartbeatQueries";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["starting", "running", "idle", "error", "stopping"];

export async function POST(request: Request) {
  const t0 = performance.now();
  try {
    const apiKeyHash = await validateMcpApiKey(request);
    if (!apiKeyHash) {
      return Response.json({ error: "Invalid or missing API key" }, { status: 401 });
    }

    const body = await request.json();
    const { workerId, status, currentRun, batchPlatform, batchSize, message, config } = body;

    if (!workerId || typeof workerId !== "string") {
      return Response.json({ error: "workerId is required" }, { status: 400 });
    }
    if (!status || !VALID_STATUSES.includes(status)) {
      return Response.json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
    }

    await upsertHeartbeat({
      workerId,
      apiKeyHash,
      status,
      currentRun: typeof currentRun === "number" ? currentRun : undefined,
      batchPlatform: typeof batchPlatform === "string" ? batchPlatform : undefined,
      batchSize: typeof batchSize === "number" ? batchSize : undefined,
      message: typeof message === "string" ? message : undefined,
      config: config && typeof config === "object" ? config : undefined,
    });

    console.debug(`[heartbeat] POST ${Math.round(performance.now() - t0)}ms worker=${workerId} status=${status}`);
    return Response.json({ success: true });
  } catch (e) {
    console.error("[heartbeat] POST error", e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

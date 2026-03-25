import { validateMcpApiKey } from "@/app/api/mcp/auth";
import { upsertRun } from "@/server/utils/queries/runQueries";

export const dynamic = "force-dynamic";

const VALID_STATUSES = ["running", "success", "failed"];

export async function POST(request: Request) {
  const t0 = performance.now();
  try {
    const apiKeyHash = await validateMcpApiKey(request);
    if (!apiKeyHash) {
      return Response.json({ error: "Invalid or missing API key" }, { status: 401 });
    }

    const body = await request.json();
    const { workerId, runNumber, status, startedAt } = body;

    if (!workerId || typeof workerId !== "string") {
      return Response.json({ error: "workerId is required" }, { status: 400 });
    }
    if (typeof runNumber !== "number" || runNumber < 1) {
      return Response.json({ error: "runNumber must be a positive integer" }, { status: 400 });
    }
    if (!status || !VALID_STATUSES.includes(status)) {
      return Response.json({ error: `status must be one of: ${VALID_STATUSES.join(", ")}` }, { status: 400 });
    }
    if (!startedAt || typeof startedAt !== "string") {
      return Response.json({ error: "startedAt is required (ISO timestamp)" }, { status: 400 });
    }

    await upsertRun({
      workerId,
      apiKeyHash,
      runNumber,
      status,
      startedAt,
      platform: typeof body.platform === "string" ? body.platform : undefined,
      endedAt: typeof body.endedAt === "string" ? body.endedAt : undefined,
      wallTimeSecs: typeof body.wallTimeSecs === "number" ? body.wallTimeSecs : undefined,
      claudeTimeSecs: typeof body.claudeTimeSecs === "number" ? body.claudeTimeSecs : undefined,
      apiTimeSecs: typeof body.apiTimeSecs === "number" ? body.apiTimeSecs : undefined,
      turns: typeof body.turns === "number" ? body.turns : undefined,
      batchSize: typeof body.batchSize === "number" ? body.batchSize : undefined,
      resolved: typeof body.resolved === "number" ? body.resolved : undefined,
      excluded: typeof body.excluded === "number" ? body.excluded : undefined,
      skipped: typeof body.skipped === "number" ? body.skipped : undefined,
      errors: typeof body.errors === "number" ? body.errors : undefined,
      highConfidence: typeof body.highConfidence === "number" ? body.highConfidence : undefined,
      mediumConfidence: typeof body.mediumConfidence === "number" ? body.mediumConfidence : undefined,
      conflicts: typeof body.conflicts === "number" ? body.conflicts : undefined,
      nameMismatches: typeof body.nameMismatches === "number" ? body.nameMismatches : undefined,
      tooAmbiguous: typeof body.tooAmbiguous === "number" ? body.tooAmbiguous : undefined,
      exitCode: typeof body.exitCode === "number" ? body.exitCode : undefined,
      failCategory: typeof body.failCategory === "string" ? body.failCategory : undefined,
      failReason: typeof body.failReason === "string" ? body.failReason : undefined,
    });

    console.debug(`[run-report] POST ${Math.round(performance.now() - t0)}ms worker=${workerId} run=${runNumber} status=${status}`);
    return Response.json({ success: true });
  } catch (e) {
    console.error("[run-report] POST error", e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

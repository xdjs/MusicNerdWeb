/** No API needed: launch only this harness, interrupt, and verify its owned resources disappear. */
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { connect } from "node:net";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
const runner = fileURLToPath(new URL("./run.mjs", import.meta.url));
for (const signal of ["SIGTERM", "SIGINT"]) {
  const child = spawn(process.execPath, [runner, "cleanup-self-test"], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "",
    errors = "",
    ready;
  const deadline = setTimeout(() => child.kill("SIGKILL"), 20000);
  const closed = new Promise((resolve) =>
    child.once("close", (code, killedBy) => resolve({ code, killedBy })),
  );
  child.stderr.on("data", (chunk) => (errors += chunk));
  try {
    await new Promise((resolve, reject) => {
      child.once("exit", () => {
        if (!ready) reject(new Error(errors || "runner exited before ready"));
      });
      child.stdout.on("data", (chunk) => {
        output += chunk;
        for (const line of output.split("\n")) {
          try {
            const row = JSON.parse(line);
            if (row.ready && !ready) {
              ready = row;
              resolve();
            }
          } catch {}
        }
      });
    });
    child.kill(signal);
    const result = await closed;
    assert.equal(result.code, signal === "SIGTERM" ? 143 : 130, errors);
    assert.equal(result.killedBy, null);
    assert.equal(existsSync(ready.artifact), false, "temporary bundle remains");
    assert.throws(
      () => process.kill(ready.browserPid, 0),
      { code: "ESRCH" },
      "owned browser remains",
    );
    await new Promise((resolve, reject) => {
      const socket = connect({ host: "127.0.0.1", port: 43166 });
      socket.once("connect", () => {
        socket.destroy();
        reject(new Error("owned Web listener remains"));
      });
      socket.once("error", (e) =>
        e.code === "ECONNREFUSED" ? resolve() : reject(e),
      );
    });
    console.log(
      JSON.stringify({
        signal,
        exitCode: result.code,
        ownedBrowserStopped: true,
        webListenerClosed: true,
        artifactRemoved: true,
      }),
    );
  } finally {
    clearTimeout(deadline);
    if (child.exitCode === null && child.signalCode === null)
      child.kill("SIGTERM");
  }
}

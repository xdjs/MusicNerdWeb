import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import { buildBrowserHarness } from "./build.mjs";
const [mode, expected, initialBio = "Original"] = process.argv.slice(2);
assert(
  ["success", "failure", "cleanup-self-test"].includes(mode) &&
    (expected || mode === "cleanup-self-test"),
  "Usage: run.mjs success|failure EXPECTED_TEXT",
);
const artifact = mkdtempSync(join(tmpdir(), "mn1655-browser-"));
let browser,
  server,
  browserServer,
  launchPromise,
  cleanupPromise,
  interrupted = false;
const apiPath = "/api/artistBio/00000000-0000-4000-8000-000000000001";
const blocked = [],
  writes = [],
  pageErrors = [];
const bounded = async (promise, ms, label) => {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error(label + " timed out")), ms);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
};
const cleanup = () =>
  (cleanupPromise ??= (async () => {
    const errors = [];
    if (launchPromise && !browserServer) {
      try {
        browserServer = await bounded(
          launchPromise,
          6000,
          "browser startup cleanup",
        );
      } catch (error) {
        errors.push(error.message);
      }
    }
    if (browserServer) {
      try {
        await bounded(browserServer.close(), 3000, "browser close");
      } catch (error) {
        errors.push(error.message);
        try {
          await bounded(browserServer.kill(), 3000, "owned browser kill");
        } catch (killError) {
          errors.push(killError.message);
        }
      }
    }
    if (server) {
      try {
        server.closeAllConnections();
        await bounded(
          new Promise((resolve, reject) =>
            server.close((error) =>
              error && error.code !== "ERR_SERVER_NOT_RUNNING"
                ? reject(error)
                : resolve(),
            ),
          ),
          2000,
          "Web server close",
        );
      } catch (error) {
        errors.push(error.message);
      }
    }
    try {
      rmSync(artifact, { recursive: true, force: true });
    } catch (error) {
      errors.push(error.message);
    }
    if (errors.length)
      throw new AggregateError(errors, "Browser harness cleanup failed");
  })());
const ensureActive = () => {
  if (interrupted) throw new Error("Browser harness interrupted");
};
for (const [signal, code] of [
  ["SIGTERM", 143],
  ["SIGINT", 130],
])
  process.once(signal, () => {
    interrupted = true;
    process.exitCode = code;
    void cleanup().then(
      () => process.exit(code),
      (error) => {
        console.error(error);
        process.exit(code);
      },
    );
  });

try {
  await buildBrowserHarness(join(artifact, "bundle.js"));
  ensureActive();
  server = createServer((req, res) => {
    if (req.url === "/bundle.js") {
      res.setHeader("Content-Type", "text/javascript");
      res.end(readFileSync(join(artifact, "bundle.js")));
      return;
    }
    if (req.url === "/spinner.svg") {
      res.setHeader("Content-Type", "image/svg+xml");
      res.end('<svg xmlns="http://www.w3.org/2000/svg"/>');
      return;
    }
    if (new URL(req.url, "http://127.0.0.1:43166").pathname !== "/") {
      res.statusCode = 404;
      res.end();
      return;
    }
    res.setHeader("Content-Type", "text/html");
    res.setHeader("Cache-Control", "no-store");
    res.end(
      '<!doctype html><html><body><div id="root"></div><div id="toast" role="status"></div><div id="refresh"></div><script>window.syntheticInitialBio=' +
        JSON.stringify(initialBio).replaceAll("<", "\\u003c") +
        ';</script><script src="/bundle.js"></script></body></html>',
    );
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(43166, "127.0.0.1", resolve);
  });
  ensureActive();
  launchPromise = chromium.launchServer({
    headless: true,
    host: "127.0.0.1",
    port: 0,
    timeout: 5000,
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
  });
  browserServer = await launchPromise;
  ensureActive();
  browser = await chromium.connect(browserServer.wsEndpoint());
  ensureActive();
  if (mode === "cleanup-self-test") {
    console.log(
      JSON.stringify({
        ready: true,
        browserPid: browserServer.process().pid,
        artifact,
        webPort: 43166,
      }),
    );
    await new Promise(() => {});
  }
  const context = await browser.newContext({ serviceWorkers: "block" });
  await context.route("**/*", async (route) => {
    const u = new URL(route.request().url());
    const allowed =
      (u.origin === "http://127.0.0.1:43166" &&
        ["/", "/bundle.js", "/spinner.svg"].includes(u.pathname)) ||
      (u.origin === "http://127.0.0.1:43165" && u.pathname === apiPath);
    if (allowed) return route.continue();
    blocked.push(u.origin + u.pathname);
    await route.abort();
  });
  const page = await context.newPage();
  page.on("pageerror", (e) => pageErrors.push(e.message));
  page.on("request", (r) => {
    if (r.method() === "PUT")
      writes.push({
        url: r.url(),
        body: r.postData(),
        authorization: r.headers().authorization,
      });
  });
  await page.goto("http://127.0.0.1:43166");
  const editor = page.getByRole("textbox", { name: "Artist biography" });
  await editor.waitFor();
  assert.equal(await editor.inputValue(), initialBio);
  const responsePromise = page.waitForResponse(
    (r) =>
      r.url() === "http://127.0.0.1:43165" + apiPath &&
      r.request().method() === "PUT",
  );
  await page.getByRole("button", { name: "Regenerate", exact: true }).click();
  const response = await responsePromise;
  await page.waitForFunction(
    () => document.getElementById("toast").textContent.length > 0,
  );
  const text = await editor.inputValue();
  const toast = await page.locator("#toast").textContent();
  if (mode === "success") {
    assert.equal(response.status(), 200);
    assert.equal(text, expected);
    assert.equal(await page.locator("#refresh").textContent(), "refreshed");
  } else {
    assert(response.status() >= 400);
    assert.equal(text, initialBio);
    assert(toast.includes(expected), toast);
    assert.equal(await page.locator("#refresh").textContent(), "");
  }
  await page.evaluate(() => localStorage.clear());
  const readPromise = page.waitForResponse(
    (r) =>
      r.url() === "http://127.0.0.1:43165" + apiPath &&
      r.request().method() === "GET",
  );
  await page.goto("http://127.0.0.1:43166/?publicReload=1");
  const reread = await readPromise;
  assert.equal(reread.status(), 200);
  const persistedBio = (await reread.json()).bio;
  const expectedPersisted = mode === "success" ? expected : initialBio;
  assert.equal(persistedBio, expectedPersisted);
  await editor.waitFor();
  await page.waitForFunction(
    (value) => document.querySelector("textarea")?.value === value,
    expectedPersisted,
  );
  assert.equal(writes.length, 1);
  assert.equal(writes[0].body, JSON.stringify({ regenerate: true }));
  assert.equal(writes[0].authorization, "Bearer local-synthetic");
  assert.deepEqual(blocked, []);
  assert.deepEqual(pageErrors, []);
  console.log(
    JSON.stringify({
      mode,
      status: response.status(),
      bio: text,
      toast,
      persistedBio,
      reloadedBio: await editor.inputValue(),
      putRequests: writes.length,
      externalRequests: blocked.length,
      browserErrors: pageErrors.length,
    }),
  );
} catch (error) {
  if (!interrupted) {
    console.error(error);
    process.exitCode = 1;
  }
} finally {
  try {
    await cleanup();
  } catch (error) {
    console.error(error);
    process.exitCode = process.exitCode || 1;
  }
}

import { spawn } from "node:child_process";
import { readFileSync, realpathSync, writeFileSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";
import { chromium } from "playwright";
const here = dirname(fileURLToPath(import.meta.url));
const artifact = realpathSync(process.argv[2]);
const preserve = process.argv[3] === "preserve";
assert(!process.argv[3] || preserve, "Unknown runner mode");
assert(
  artifact.startsWith("/private/tmp/mn-1655-next-") ||
    artifact.startsWith("/tmp/mn-1655-next-"),
);
assert.equal(
  JSON.parse(readFileSync(join(artifact, "synthetic-artifact.json"), "utf8"))
    .kind,
  "local-only-next-profile",
);
const socket = process.env.MN_1655_PG_SOCKET;
assert(socket, "Parent must supply synthetic socket");
const socketPattern = /^\/(?:private\/)?tmp\/mn-1655-pg\.[A-Za-z0-9]+$/;
assert(socketPattern.test(socket), "Exact synthetic cluster path required");
assert(
  socketPattern.test(realpathSync(socket)),
  "Canonical synthetic cluster path required",
);
const socketStat = statSync(socket);
assert(
  socketStat.isDirectory() &&
    socketStat.uid === process.getuid() &&
    (socketStat.mode & 0o077) === 0,
  "Owned private socket directory required",
);
const diagnostic = process.env.MN_1655_NEXT_DEV_DIAGNOSTIC === "yes";
const env = {
  PATH: dirname(process.execPath) + ":/usr/bin:/bin",
  TMPDIR: "/tmp",
  NODE_ENV: diagnostic ? "development" : "production",
  NEXT_PUBLIC_SPOTIFY_WEB_CLIENT_ID: "stub",
  NEXT_PUBLIC_SPOTIFY_WEB_CLIENT_SECRET: "stub",
  NEXT_TELEMETRY_DISABLED: "1",
  MN_1655_PG_SOCKET: socket,
  NODE_OPTIONS: "--require=" + join(here, "runtime-network.cjs"),
};
const server = spawn(
  process.execPath,
  [
    join(artifact, "node_modules/next/dist/bin/next"),
    diagnostic ? "dev" : "start",
    "-H",
    "127.0.0.1",
    "-p",
    "43166",
  ],
  { cwd: artifact, env, stdio: ["ignore", "pipe", "pipe"] },
);
let serverOutput = "",
  browserServer,
  browser,
  page,
  launchPromise,
  cleanupPromise,
  interrupted = false;
server.stdout.on("data", (d) => (serverOutput += d));
server.stderr.on("data", (d) => (serverOutput += d));
const bounded = async (promise, ms, label) => {
  let timer;
  try {
    return await Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(Error(label + " timed out")), ms);
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
        browserServer = await bounded(launchPromise, 6000, "browser startup");
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
    if (server.exitCode === null && server.signalCode === null) {
      const exited = new Promise((resolve) => server.once("exit", resolve));
      server.kill("SIGTERM");
      try {
        await bounded(exited, 3000, "Next stop");
      } catch (error) {
        errors.push(error.message);
        server.kill("SIGKILL");
        try {
          await bounded(exited, 1000, "owned Next kill");
        } catch (killError) {
          errors.push(killError.message);
        }
      }
    }
    if (errors.length)
      throw new AggregateError(errors, "Owned Next harness cleanup failed");
  })());
const ensureActive = () => {
  if (interrupted) throw Error("Next harness interrupted");
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
  for (let i = 0; i < 100; i++) {
    if (serverOutput.includes("Ready in")) break;
    if (server.exitCode !== null) throw Error(serverOutput);
    await new Promise((r) => setTimeout(r, 100));
    if (i === 99) throw Error("Next readiness timeout: " + serverOutput);
  }
  ensureActive();
  launchPromise = chromium.launchServer({
    headless: true,
    host: "127.0.0.1",
    timeout: 5000,
    handleSIGTERM: false,
    handleSIGINT: false,
    handleSIGHUP: false,
  });
  browserServer = await launchPromise;
  ensureActive();
  browser = await chromium.connect(browserServer.wsEndpoint());
  ensureActive();
  const context = await browser.newContext({
    serviceWorkers: "block",
    viewport: { width: 1280, height: 1000 },
  });
  const adaptedFavicons = [];
  const omittedPagePrefetches = [];
  const blocked = [],
    errors = [],
    requests = [],
    responses = [],
    successfulApiReads = new Set();
  await context.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (
      u.origin === "https://www.google.com" &&
      u.pathname === "/s2/favicons" &&
      route.request().method() === "GET" &&
      route.request().resourceType() === "image"
    ) {
      adaptedFavicons.push(u.pathname);
      return route.fulfill({
        status: 200,
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="gray"/></svg>',
      });
    }
    if (
      u.origin === "http://127.0.0.1:43166" ||
      u.origin === "http://127.0.0.1:43165"
    )
      return route.continue();
    blocked.push(u.origin + u.pathname);
    return route.abort();
  });
  page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) =>
    requests.push({ url: r.url(), method: r.method() }),
  );
  page.on("response", (r) => {
    const request = r.request();
    if (
      request.method() === "GET" &&
      r.status() === 200 &&
      new URL(r.url()).origin === "http://127.0.0.1:43165"
    )
      successfulApiReads.add(new URL(r.url()).pathname);
    const u = new URL(r.url());
    if (
      r.status() === 404 &&
      request.method() === "GET" &&
      u.origin === "http://127.0.0.1:43166" &&
      ["/", "/about", "/terms", "/privacy"].includes(u.pathname) &&
      u.searchParams.has("_rsc") &&
      request.headers()["next-router-prefetch"] === "1"
    ) {
      omittedPagePrefetches.push(u.pathname);
      return;
    }
    if (r.status() >= 400) responses.push({ url: r.url(), status: r.status() });
  });
  const artist = "00000000-0000-4000-8000-000000000001",
    url = "http://127.0.0.1:43166/artist/" + artist;
  await page.goto(url);
  await page
    .getByRole("button", { name: "Edit profile", exact: true })
    .first()
    .waitFor();
  await page.waitForFunction(
    async (id) => {
      const r = await fetch(
        "http://127.0.0.1:43165/api/onboarding/" + id + "/state",
      );
      return r.ok && (await r.json()).complete;
    },
    artist,
    { timeout: 40000 },
  );
  await page
    .getByRole("region", { name: "Research status" })
    .waitFor({ state: "detached" });
  const skip = page.getByRole("button", { name: "Skip", exact: true });
  if (await skip.isVisible()) await skip.click();
  assert(
    requests.some(
      (r) =>
        r.method === "POST" &&
        r.url.endsWith("/onboarding/" + artist + "/build"),
    ),
    "Actual claimant arrival must start setup",
  );
  await page
    .getByRole("button", { name: "Edit profile", exact: true })
    .first()
    .click();
  const editor = page.getByRole("textbox", { name: "Artist biography" });
  await editor.waitFor();
  await page.waitForFunction(
    () =>
      (
        document.querySelector('textarea[aria-label="Artist biography"]')
          ?.value ?? ""
      ).length > 0,
  );
  const initial = await editor.inputValue();
  assert(initial.length > 0, "setup must supply or preserve About");
  const manual = "Local claimant-authored About";
  if (!preserve) {
    const regen = page.getByRole("button", { name: "Regenerate", exact: true });
    const generatedResponse = page.waitForResponse(
      (r) =>
        r.request().method() === "PUT" &&
        new URL(r.url()).pathname === "/api/artistBio/" + artist,
    );
    await regen.click();
    const generated = await generatedResponse;
    assert.equal(generated.status(), 200);
    const generatedBody = await generated.json();
    await page
      .getByText(generatedBody.message ?? "Bio regenerated", { exact: true })
      .first()
      .waitFor();
    await page.waitForFunction(
      () =>
        document.querySelector('textarea[aria-label="Artist biography"]')
          ?.value === "Synthetic About",
    );
    await editor.fill(manual);
    await page
      .getByRole("button", { name: "Save", exact: true })
      .first()
      .click();
    await page.getByText("Bio saved", { exact: true }).first().waitFor();
    await page.getByRole("tab", { name: "Bios", exact: true }).click();
    const show = page.getByRole("button", { name: /Show version history/ });
    if (await show.isVisible()) await show.click();
    const row = page
      .locator("div.glass-subtle")
      .filter({ has: page.getByText(manual, { exact: true }) })
      .last();
    const pin = row.getByRole("button", { name: "Pin", exact: true });
    if (await pin.isEnabled()) await pin.click();
    await page.waitForFunction(
      () =>
        document.querySelector('textarea[aria-label="Artist biography"]')
          ?.disabled === true,
    );
  } else {
    assert.equal(initial, manual, "Setup must retain manual About");
    await page.waitForFunction(
      () =>
        document.querySelector('textarea[aria-label="Artist biography"]')
          ?.disabled === true,
    );
    assert.equal(await editor.isDisabled(), true, "Setup must retain pin");
  }
  await page.reload();
  await page
    .getByRole("button", { name: "Edit profile", exact: true })
    .first()
    .click();
  await editor.waitFor();
  await page.waitForFunction(
    () =>
      document.querySelector('textarea[aria-label="Artist biography"]')
        ?.disabled === true,
  );
  assert.equal(await editor.inputValue(), manual);
  assert.equal(await editor.isDisabled(), true);
  for (const suffix of ["latest-refresh", "research/discoveries"]) {
    assert(
      successfulApiReads.has("/api/artist/" + artist + "/" + suffix),
      "Ancillary read must succeed: " + suffix,
    );
  }
  assert.deepEqual(blocked, []);
  assert.deepEqual(errors, []);
  assert.deepEqual(responses, []);
  console.log(
    JSON.stringify({
      fullNext: true,
      mode: preserve ? "preserve" : "edit",
      initial,
      manual,
      pinnedAfterReload: true,
      setupStarted: true,
      serverActions: requests.filter(
        (r) =>
          r.method === "POST" && r.url.startsWith("http://127.0.0.1:43166"),
      ).length,
      externalRequests: blocked.length,
      locallyAdaptedFavicons: adaptedFavicons.length,
      omittedPagePrefetches,
    }),
  );
} catch (e) {
  if (!interrupted) {
    console.error(e);
    if (page) {
      try {
        const file = "/tmp/mn1655-next-failure-" + process.pid + ".json";
        writeFileSync(
          file,
          JSON.stringify(
            { body: await page.locator("body").innerText(), url: page.url() },
            null,
            2,
          ),
        );
        console.error("Synthetic browser evidence:", file);
      } catch (captureError) {
        console.error("Synthetic evidence capture failed", captureError);
      }
    }
    console.error(serverOutput);
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

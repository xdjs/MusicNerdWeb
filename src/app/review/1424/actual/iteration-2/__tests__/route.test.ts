import { GET } from "../route";

const original = { ...process.env };
afterEach(() => { process.env = { ...original }; });

it.each(["production", "development", undefined])("keeps iteration two unavailable outside preview or local development (%s)", async vercelEnv => {
  Object.assign(process.env, { NODE_ENV: "production" });
  if (vercelEnv) process.env.VERCEL_ENV = vercelEnv;
  else delete process.env.VERCEL_ENV;
  const response = GET();
  expect(response.status).toBe(404);
  expect(await response.text()).toBe("Not found");
});

it.each([["production", "preview"], ["development", undefined]])("serves the static versioned report in %s/%s", async (nodeEnv, vercelEnv) => {
  Object.assign(process.env, { NODE_ENV: nodeEnv });
  if (vercelEnv) process.env.VERCEL_ENV = vercelEnv;
  else delete process.env.VERCEL_ENV;
  const response = GET();
  const html = await response.text();
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/html");
  expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
  expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(html.match(/class="case"/g)).toHaveLength(10);
  expect(html).toContain('href="/review/1424/actual"');
  expect(html).toContain("Transfer cases");
  expect(html).toContain("Development cases");
  expect(html).not.toMatch(/<script|<iframe|<img|<form|<link\b|\son\w+=/i);
});

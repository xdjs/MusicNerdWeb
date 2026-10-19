import { GET } from "../route";

const original = { ...process.env };
afterEach(() => { process.env = { ...original }; });

it.each(["production", "development", undefined])("withholds the fan report outside preview or local development (%s)", async vercelEnv => {
  Object.assign(process.env, { NODE_ENV: "production" });
  if (vercelEnv) process.env.VERCEL_ENV = vercelEnv;
  else delete process.env.VERCEL_ENV;
  const response = GET();
  expect(response.status).toBe(404);
  expect(await response.text()).toBe("Not found");
});

it.each([["production", "preview"], ["development", undefined]])("serves all frozen fan turns and limitations in %s/%s", async (nodeEnv, vercelEnv) => {
  Object.assign(process.env, { NODE_ENV: nodeEnv });
  if (vercelEnv) process.env.VERCEL_ENV = vercelEnv;
  else delete process.env.VERCEL_ENV;
  const response = GET();
  const html = await response.text();
  expect(response.status).toBe(200);
  expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  expect(html.match(/class="case"/g)).toHaveLength(11);
  expect(html).toContain("I’m new to 72 Rats. What should I listen to first?");
  expect(html).toContain("LATASHÁ");
  expect(html).toContain("Node 23.11.0");
  expect(html).toContain("Research is temporarily unavailable");
  expect(html).toContain('href="/review/1424/actual/fan-experience/extension"');
  expect(html).not.toMatch(/<script|<iframe|<img|<form|<link\b|\son\w+=/i);
});

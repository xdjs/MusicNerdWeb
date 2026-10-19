import { GET } from "../route";

const original = { ...process.env };
afterEach(() => { process.env = { ...original }; });

it.each(["production", "development", undefined])("does not publish saved answers outside preview or local development (%s)", async vercelEnv => {
  Object.assign(process.env, { NODE_ENV: "production" });
  if (vercelEnv) process.env.VERCEL_ENV = vercelEnv;
  else delete process.env.VERCEL_ENV;
  const response = GET();
  expect(response.status).toBe(404);
  expect(await response.text()).not.toContain("Pax Cedar");
});

it.each([["production", "preview"], ["development", undefined]])("serves only the static reviewed comparison in %s/%s", async (nodeEnv, vercelEnv) => {
  Object.assign(process.env, { NODE_ENV: nodeEnv });
  if (vercelEnv) process.env.VERCEL_ENV = vercelEnv;
  else delete process.env.VERCEL_ENV;
  const response = GET();
  const html = await response.text();
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toContain("text/html");
  expect(response.headers.get("content-security-policy")).toContain("default-src 'none'");
  expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow");
  expect(html.match(/data-testid="answer"/g)).toHaveLength(32);
  expect(html.match(/class="case"/g)).toHaveLength(16);
  expect(html).toContain("recorded model outputs against fictional saved originals");
  expect(html).toContain("not causal proof");
  expect(html).toContain('href="/review/1424"');
  expect(html).not.toMatch(/<script|<iframe|<img|<form|<link\b|\son\w+=/i);
});

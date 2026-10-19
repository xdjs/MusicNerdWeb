import { GET } from "../route";

const original = { ...process.env };
afterEach(() => { process.env = { ...original }; });

it.each([["production", "production"], ["production", undefined]])(
  "withholds the confirmation report outside preview or local development (%s/%s)",
  async (nodeEnv, vercelEnv) => {
    Object.assign(process.env, { NODE_ENV: nodeEnv });
    if (vercelEnv) process.env.VERCEL_ENV = vercelEnv;
    else delete process.env.VERCEL_ENV;
    const response = GET();
    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not found");
  },
);

it.each([["production", "preview"], ["development", undefined]])(
  "serves the actual 17-case comparison in %s/%s",
  async (nodeEnv, vercelEnv) => {
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
    expect(html.match(/class="case"/g)).toHaveLength(17);
    for (const id of ["F01", "F02", "F03", "F04", "F05", "F06", "F07", "F08", "F09", "F10", "F11", "E01", "E02", "E03", "E04", "E05", "E06"]) {
      expect(html).toContain(`id="${id}"`);
    }
    expect(html).toContain("Same questions, candidate update");
    expect(html).toContain("known-case regression checks");
    expect(html).toContain('href="/review/1424/actual/fan-experience"');
    expect(html).toContain('href="/review/1424/actual/fan-experience/extension"');
    expect(html).not.toMatch(/<script|<iframe|<img|<form|<link\b|\son\w+=/i);
  },
);

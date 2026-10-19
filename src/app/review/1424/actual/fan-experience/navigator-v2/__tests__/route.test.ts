import { GET } from "../route";

const original = { ...process.env };
afterEach(() => { process.env = { ...original }; });

it.each([["production", "production"], ["production", undefined]])(
  "withholds the navigator diagnostic outside preview or local development (%s/%s)",
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
  "serves the saved F04/N01 diagnostic in %s/%s",
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
    expect(html.match(/class="case"/g)).toHaveLength(2);
    expect(html).toContain('id="F04"');
    expect(html).toContain('id="N01"');
    expect(html).toContain("Original fan-experience cohort");
    expect(html).toContain("Fixed-v1 · prior F04");
    expect(html).toContain("Navigator-v2 · current run");
    expect(html).toContain("Not improved");
    expect(html).toContain("Independent review locked");
    expect(html).toContain("full 17-case confirmation report");
    expect(html).toContain("actual navigator-v2 F04 turn as context");
    expect(html).toContain("Remaining quality issue");
    expect(html).not.toMatch(/<script|<iframe|<img|<form|<link\b|\son\w+=/i);
  },
);

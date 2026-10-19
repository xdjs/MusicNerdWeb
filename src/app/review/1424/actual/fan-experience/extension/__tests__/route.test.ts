import { GET } from "../route";

const original = { ...process.env };
afterEach(() => { process.env = { ...original }; });

it.each([["production", "production"], ["production", undefined]])(
  "withholds the extension report outside preview or local development (%s/%s)",
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
  "serves the saved six-turn extension with review limits in %s/%s",
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
    expect(html.match(/class="case"/g)).toHaveLength(6);
    expect(html).toContain("Sound of Fractures");
    expect(html).toContain("canonical official plural name");
    expect(html).toContain("does not establish ownership");
    expect(html).toContain("0 eligible saved originals");
    expect(html).toContain("Node.js 24");
    expect(html).toContain("18 accounted request(s)");
    expect(html).toContain("$0.08133625");
    expect(html).toContain("$1.03226085");
    expect(html).toContain("$0.027342");
    expect(html).toContain('href="/review/1424/actual/fan-experience"');
    expect(html).not.toMatch(/<script|<iframe|<img|<form|<link\b|\son\w+=/i);
  },
);

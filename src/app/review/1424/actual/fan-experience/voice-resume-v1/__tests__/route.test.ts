import { GET } from "../route";

const original = { ...process.env };
afterEach(() => { process.env = { ...original }; });

it.each([["production", "production"], ["production", undefined]])(
  "withholds the saved report outside preview or local development (%s/%s)",
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
  "serves all five saved turns and the stopped-attempt evidence in %s/%s",
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

    expect(html.match(/class="case"/g)).toHaveLength(5);
    for (const id of ["F08", "E01", "E02", "F04", "N01"]) expect(html).toContain(`id="${id}"`);
    expect(html).toContain("Preserved original attempt · F08");
    expect(html).toContain("Stopped before a checked answer");
    expect(html).toContain("HTTP 202 and 503");
    expect(html).toMatch(/not five fresh paid generations/i);
    expect(html).toContain("I couldn't finish that lookup. Please try again.");
    expect(html).toContain("Try again</button>");
    expect(html).toContain("Locked independent review");
    expect(html).toContain("not assessable");
    expect(html).toContain("actual preceding answer");
    expect(html).toContain("What should I listen for to hear that change?");
    expect(html).not.toMatch(/<script|<iframe|<img|<form|<link\b|\son\w+=/i);

    const f04Start = html.indexOf('id="F04"');
    const f04Current = html.indexOf('<article class="lane current">', f04Start);
    const f04Answer = html.slice(f04Current).match(/<p data-testid="answer"[^>]*>[\s\S]*?<\/p>/)?.[0];
    const n01Start = html.indexOf('id="N01"');
    const n01CurrentContext = html.indexOf("Voice-resume-v1 run · actual preceding answer", n01Start);
    const n01ContextAnswer = html.slice(n01CurrentContext).match(/<p data-testid="answer"[^>]*>[\s\S]*?<\/p>/)?.[0];
    expect(f04Answer).toBeTruthy();
    expect(n01ContextAnswer).toBe(f04Answer);
  },
);

const load = (vercelEnv?: string, previewUrl?: string) => {
    const originalPreview = process.env.NEXT_PUBLIC_MUSICNERD_API_PREVIEW_URL;
    if (previewUrl === undefined) delete process.env.NEXT_PUBLIC_MUSICNERD_API_PREVIEW_URL;
    else process.env.NEXT_PUBLIC_MUSICNERD_API_PREVIEW_URL = previewUrl;
    const original = process.env.NEXT_PUBLIC_VERCEL_ENV;
    if (vercelEnv === undefined) delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    else process.env.NEXT_PUBLIC_VERCEL_ENV = vercelEnv;
    let fn!: typeof import("../musicNerdApiUrl").musicNerdApiUrl;
    jest.isolateModules(() => { fn = require("../musicNerdApiUrl").musicNerdApiUrl; });
    if (original === undefined) delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    else process.env.NEXT_PUBLIC_VERCEL_ENV = original;
    if (originalPreview === undefined) delete process.env.NEXT_PUBLIC_MUSICNERD_API_PREVIEW_URL;
    else process.env.NEXT_PUBLIC_MUSICNERD_API_PREVIEW_URL = originalPreview;
    return fn;
};

describe("musicNerdApiUrl", () => {
    it("uses MusicNerdAPI production on a production deployment", () => {
        expect(load("production")("/api/research/advance")).toBe("https://musicnerd-api.vercel.app/api/research/advance");
    });

    it("uses the staging MusicNerdAPI everywhere else: previews, staging and local", () => {
        expect(load("preview")("/api/health")).toBe("https://musicnerd-api-staging.vercel.app/api/health");
        expect(load(undefined)("/api/health")).toBe("https://musicnerd-api-staging.vercel.app/api/health");
    });
});

it("pairs an isolated Web preview with its API preview", () => {
    expect(load("preview", "https://api-fix.example/")("/api/research/advance"))
        .toBe("https://api-fix.example/api/research/advance");
});
it("ignores the preview override in production", () => {
    expect(load("production", "https://api-fix.example")("/api/health"))
        .toBe("https://musicnerd-api.vercel.app/api/health");
});

const load = (vercelEnv?: string) => {
    const original = process.env.NEXT_PUBLIC_VERCEL_ENV;
    if (vercelEnv === undefined) delete process.env.NEXT_PUBLIC_VERCEL_ENV;
    else process.env.NEXT_PUBLIC_VERCEL_ENV = vercelEnv;
    let fn!: typeof import("../musicNerdApiUrl").musicNerdApiUrl;
    jest.isolateModules(() => { fn = require("../musicNerdApiUrl").musicNerdApiUrl; });
    process.env.NEXT_PUBLIC_VERCEL_ENV = original;
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

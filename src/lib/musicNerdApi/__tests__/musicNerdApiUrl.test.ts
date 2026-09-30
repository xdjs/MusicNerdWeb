import { musicNerdApiUrl } from "../musicNerdApiUrl";

describe("musicNerdApiUrl", () => {
    const original = process.env.NEXT_PUBLIC_MUSICNERD_API_URL;
    afterEach(() => { process.env.NEXT_PUBLIC_MUSICNERD_API_URL = original; });

    it("joins MusicNerdAPI's base URL and a path", () => {
        process.env.NEXT_PUBLIC_MUSICNERD_API_URL = "https://api.example.test";
        expect(musicNerdApiUrl("/api/research/advance")).toBe("https://api.example.test/api/research/advance");
    });
});

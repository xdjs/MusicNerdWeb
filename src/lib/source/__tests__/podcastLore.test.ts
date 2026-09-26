import { extractPodcastEpisodeIdentity } from "../podcastEpisodeIdentity";
import { groupPodcastSources } from "../groupPodcastSources";
import { normalizeLoreDiscoveryUrl } from "../normalizeLoreDiscoveryUrl";

const apple = "https://podcasts.apple.com/tw/podcast/episode/id1877956390?i=1000780276007&l=en-GB";
const iheart = "https://www.iheart.com/podcast/269-the-hook-323320053/episode/episode-340460192/";
const media = "https://www.buzzsprout.com/2596593/episodes/19605095-episode.mp3";

describe("podcast Lore identity", () => {
    it("extracts the same recording from Apple and iHeart, regardless of media tracking", () => {
        const appleHtml = `<meta property="og:title" content="Episode"><script>{"partOfSeries":{"name":"The Hook"},"guid":"Buzzsprout-19605095","feedUrl":"https://rss.buzzsprout.com/2596593.rss","streamUrl":"${media}"}</script>`;
        const iheartHtml = `<meta content="Episode  The Hook | iHeart" property="og:title"><script>"mediaUrl","${media}?source=iheart"</script>`;
        expect(extractPodcastEpisodeIdentity(apple, appleHtml)).toEqual({
            podcastEpisodeKey: "buzzsprout:2596593:19605095",
            podcastShowTitle: "The Hook",
            podcastEpisodeTitle: "Episode",
        });
        expect(extractPodcastEpisodeIdentity(iheart, iheartHtml)?.podcastEpisodeKey).toBe("buzzsprout:2596593:19605095");
    });

    it("leaves ambiguous, unrelated, or non-episode pages ungrouped", () => {
        const html = `${media} https://www.buzzsprout.com/2596593/episodes/19605096-next.mp3`;
        expect(extractPodcastEpisodeIdentity(apple, html)).toBeNull();
        expect(extractPodcastEpisodeIdentity(apple, `"guid":"Buzzsprout-19605096","feedUrl":"https://rss.buzzsprout.com/2596593.rss","streamUrl":"${media}"`)).toBeNull();
        expect(extractPodcastEpisodeIdentity(apple.replace("?i=1000780276007", ""), media)).toBeNull();
        expect(extractPodcastEpisodeIdentity("https://example.org/episode", media)).toBeNull();
    });
});

describe("public podcast cards", () => {
    const source = (id: string, artistId: string, url: string, podcastEpisodeKey: string | null, status = "approved") => ({ id, artistId, url, podcastEpisodeKey, status, type: "audio" });

    it("groups only verified siblings for one artist while preserving each URL", () => {
        const key = "buzzsprout:2596593:19605095";
        const cards = groupPodcastSources([
            source("a", "artist-1", apple, key), source("b", "artist-1", iheart, key),
            source("c", "artist-1", apple.replace("6007", "6008"), "buzzsprout:2596593:19605096"),
            source("d", "artist-2", iheart, key), source("e", "artist-1", iheart + "other", null),
        ]);
        expect(cards.map(card => card.kind)).toEqual(["podcast", "source", "source", "source"]);
        expect(cards[0].kind === "podcast" && cards[0].sources.map(item => item.url)).toEqual([apple, iheart]);
    });

    it("excludes pending or rejected rows when caller supplies approved sources", () => {
        const rows = [source("a", "artist-1", apple, "key"), source("b", "artist-1", iheart, "key", "pending")];
        expect(groupPodcastSources(rows.filter(row => row.status === "approved"))).toHaveLength(1);
        expect(groupPodcastSources(rows.filter(row => row.status === "approved"))[0].kind).toBe("source");
    });
});

it("keeps Apple's episode id during discovery dedup but ignores tracking parameters", () => {
    expect(normalizeLoreDiscoveryUrl(apple)).not.toBe(normalizeLoreDiscoveryUrl(apple.replace("6007", "6008")));
    expect(normalizeLoreDiscoveryUrl(apple)).toBe(normalizeLoreDiscoveryUrl(apple.replace("&l=en-GB", "&l=fr-FR")));
});

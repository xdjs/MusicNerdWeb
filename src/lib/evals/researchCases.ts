/**
 * The research suite's dataset: artists on the staging database with hand-verified
 * ground truth. Every handle was checked against a live page and every forbidden host is
 * a namesake this pipeline has actually fallen for. The five benchmark cases are Pete's,
 * from `scripts/research-benchmark.ts` (2026-08-26 → 08-31); the `expectedProfiles` on
 * Pete Rango is the #1273 case, added 2026-09-22; the `minSources` floors were added
 * 2026-09-23 (#1329 row 2b).
 *
 * Staging ids. The same artist has a different id on production.
 */
export type ResearchCase = {
    key: string;
    id: string;
    name: string;
    /** Left in place at reset: what an artist actually arrives holding. */
    seed: string[];
    /** Platform → the handle we know is theirs, or several when more than one genuinely
     *  is. The FIRST entry is the primary; any of them counts as correct. */
    expect: Record<string, string | string[]>;
    /** Hosts that are a DIFFERENT subject. Any of these stored is a failure. */
    forbidHosts: string[];
    /** Handles belonging to somebody else, usually a namesake in our own directory. */
    forbidHandles?: Record<string, string[]>;
    /** Artist-profile URLs that belong in Links, not Lore (#1273). Id form; the scorer
     *  matches the slugged form too. */
    expectedProfiles: string[];
    /** Sources the pipeline kept for this artist on the research benchmark's 2026-08-31
     *  run. `scoreSourcesKept` is 1 at or above it. */
    minSources: number;
    note: string;
};

export const RESEARCH_CASES: ResearchCase[] = [
    {
        key: "pete",
        id: "50f23458-df64-4381-8042-7333e8b64531",
        name: "Pete Rango",
        seed: ["spotify", "deezer"],
        expect: {
            instagram: "p3t3rango", x: "p3t3rango", youtube: "peterango",
            soundcloud: "peterango", bandcamp: "peterango", twitch: "p3t3rango",
            facebook: "p3t3rango",
        },
        // "Rango" is a Hans Zimmer film soundtrack; "Pete" is Seeger and Murphy.
        forbidHosts: ["screenrant.com", "allmusic.com", "designingsound.org", "screenanarchy.com",
                      "shoutsmusic.blog", "genemyers.wordpress.com"],
        // #1273: his Apple Music artist page (the id that resolves and lists "OH-KAY!",
        // "Wild Life EP", "Breakdown"). The 1330310245 id stored on production in
        // August returns 404 and is not this artist's page.
        expectedProfiles: ["https://music.apple.com/us/artist/1513734272"],
        minSources: 9,
        note: "Namesake-dense: a film soundtrack and two famous Petes. Carries the #1273 case.",
    },
    {
        key: "dupes",
        id: "ecba8cd6-ae0a-4ef5-9b11-5d5c10fce515",
        name: "Sherwinn Dupes Brice",
        seed: ["spotify", "deezer"],
        expect: {
            instagram: "dupesdidit", youtube: "dupesdidit", facebook: "dupesdidit",
            soundcloud: "dupesdidit", bandcamp: "dupes",
        },
        forbidHosts: ["thereader.com"], // a Lee Brice interview
        expectedProfiles: [],
        minSources: 9,
        note: "Long tail. Handle is NOT derivable from his name — only his own site states it.",
    },
    {
        key: "pharaoh",
        id: "baa7dd84-772b-480a-83e7-114ae183eaf7",
        name: "Pharaoh Sistare",
        seed: ["deezer"],
        // Each verified against a live page title. She has NO Twitch —
        // twitch.tv/pharaohsistare returns the bare string "Twitch" — and a run that
        // gives her one is wrong.
        expect: {
            instagram: "pharaohsistare", x: "pharaohsistare", youtube: "pharaohsistare",
            soundcloud: "pharaohsistare", bandcamp: "pharaohsistare",
        },
        forbidHandles: { twitch: ["pharaohsistare"] },
        // A Finnish band, an unrelated "Pharaoh", and a different artist called Pharaoh Jo.
        forbidHosts: ["echoesanddust.com", "teethofthedivine.com", "medium.com"],
        expectedProfiles: [],
        minSources: 2,
        note: "Thin coverage. The test is that thin does not become wrong.",
    },
    {
        key: "blackdave",
        id: "ffe3bc54-0b5a-41ff-8c1c-8bd303bba80e",
        name: "Black Dave",
        seed: ["spotify"],
        expect: {},
        // "Black Dave" reduces to the token "black". Chord DAVE is a DAC; Dave is a UK
        // rapper with Guardian coverage. Both reached a real artist's vault.
        forbidHosts: ["head-fi.org", "theguardian.com", "chordelectronics.co.uk", "whathifi.com"],
        // Two OTHER Black Daves are in our own directory, plus black_davem, a fourth
        // account whose title also reads "Black Dave". On a cold start these are not
        // separable from outside, so taking any of them is a wrong link.
        forbidHandles: {
            instagram: ["blackdave.xyz", "blackdave", "black_davem"],
            youtube: ["blackdavemk2"], facebook: ["blackdavemk2", "blackdavenyc"],
            soundcloud: ["blackdavemk2", "blackdavenyc"], bandcamp: ["blackdavemk2"],
            twitch: ["black_davem"],
        },
        expectedProfiles: [],
        minSources: 5,
        note: "Three Black Daves exist in this directory. Cross-contamination is the failure.",
    },
    {
        key: "mk2",
        id: "011645a7-a9c2-494c-a81f-2c10cdf1b756",
        name: "Black Dave MK2",
        seed: ["spotify", "deezer"],
        // He runs BOTH @blackdave.xyz and @blackdavemk2 and confirmed both (8/31); x and
        // twitch confirmed his the same day. twitch=BlackDave arrived by propagating his
        // confirmed X handle on an og:image alone, on a name three artists share: right,
        // but not reasoned to.
        expect: { instagram: ["blackdave.xyz", "blackdavemk2"], x: "BlackDave", twitch: "BlackDave" },
        forbidHosts: ["head-fi.org", "theguardian.com", "chordelectronics.co.uk", "whathifi.com",
                      "thrashermagazine.com", "quartersnacks.com"], // the OTHER Black Dave's skate press
        // The sharpest case in the set: same name as two other artists we hold.
        forbidHandles: {
            instagram: ["blackdaveblackdave", "blackdave", "black_davem"],
            x: ["blackdavenyc"], soundcloud: ["blackdaveblackdave", "blackdavenyc"],
            bandcamp: ["black-dave"], twitch: ["black_davem"],
        },
        expectedProfiles: [],
        minSources: 4,
        note: "Must not inherit the skater-rapper Black Dave's press or handles. Runs two Instagrams; both are his.",
    },
];

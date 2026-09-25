/** Progress group ids emitted by runAutoBuild, in the order they run. Kept in
 *  sync with turnHandlers.ts by hand — a stage that never reports simply stays
 *  pending rather than breaking the view. */
export const BUILD_STAGES = [
    { group: "platform-search", label: "Finding your profiles" },
    { group: "source-search", label: "Reading what people wrote about you" },
    { group: "about-write", label: "Writing your About" },
] as const;

/** The About stage's two calls, in the order they run, and what each writes. */
export const BUILD_DRAFTS = [
    { stage: "doc", label: "Lore document" },
    { stage: "about", label: "About" },
] as const;

/** A profile the build found or linked, as its card shows it. */
export type ProfileView = {
    siteName: string;
    displayName: string;
    value: string;
    profileUrl: string | null;
    logoUrl: string | null;
    previewImage: string | null;
};

/** One item from useOnboardingChat, as the research view reads it: `progress`
 *  items drive the stages; `writing` items (with `stage`) carry the draft the
 *  About stage is writing, one per call; `candidates` and `linked` items carry
 *  profiles (found live, then written); an `unreachable` item names the
 *  platforms that refused to answer. */
export type BuildItem = {
    kind: string;
    text?: string;
    done?: boolean;
    group?: string;
    stage?: "doc" | "about";
    candidates?: ProfileView[];
    platforms?: string[];
};

export type StageState = "pending" | "active" | "done" | "error";

export type StageView = { group: string; label: string; state: StageState };

export type DraftView = { label: string; text: string };

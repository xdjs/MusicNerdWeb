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

/** One item from useOnboardingChat, as the build popup reads it: `progress`
 *  items drive the stages; `writing` items (with `stage`) carry the draft the
 *  About stage is writing, one per call. */
export type BuildItem = { kind: string; text?: string; done?: boolean; group?: string; stage?: "doc" | "about" };

export type StageState = "pending" | "active" | "done";

export type StageView = { group: string; label: string; state: StageState };

export type DraftView = { label: string; text: string };

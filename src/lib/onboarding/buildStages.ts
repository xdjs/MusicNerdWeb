/** A profile the build found or linked, as its card shows it. */
export type ProfileView = {
    siteName: string;
    displayName: string;
    value: string;
    profileUrl: string | null;
    logoUrl: string | null;
    previewImage: string | null;
};

/** A source research saved, as its card or row shows it. */
export type SourceView = { title: string | null; url: string; ogImage: string | null };

/** One item from useOnboardingChat, as the in-place build reads it
 *  (`buildFailure`: the last item, when it is an error). */
export type BuildItem = {
    kind: string;
    text?: string;
    done?: boolean;
    group?: string;
    stage?: "doc" | "about";
    candidates?: ProfileView[];
    platforms?: string[];
    saved?: SourceView[];
};

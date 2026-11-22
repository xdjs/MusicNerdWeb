/**
 * Classes and labels shared by the OAuth approve and connected-agents pages
 * (#1696 design). Colours are the brand tokens plus the ActivityFeed light/dark
 * set DESIGN.md names; they avoid classes the global dark-mode overrides
 * rewrite (`text-muted-foreground`, `text-maroon`, `bg-white`, `text-black`).
 */

/** Secondary text: mauve-grey in light, cool grey in dark. */
export const MUTED_TEXT = 'text-[#5a4d5e] dark:text-[#a0aec0]';

/** The page's glass panel, with a visible edge on the light backdrop. */
export const PANEL = 'glass !border-maroon/10 dark:!border-white/[0.08]';

/** A nested surface inside a panel. */
export const INSET = 'bg-maroon/5 dark:bg-white/5';

/** Hairline between rows inside a panel. */
export const DIVIDER = 'border-maroon/10 dark:border-white/[0.08]';

/** Links: mauve in light, cyan in dark (DESIGN.md's light→dark accent swap). */
export const LINK = 'text-maroon/90 underline underline-offset-2 hover:text-[#c44a8c] dark:text-pastyblue dark:hover:text-pastyblue/80';

/** The homepage manifesto headline: bold, tight, grey. */
export const HEADLINE = 'font-bold tracking-[-0.045em] text-[#77717a] dark:text-[#a9a5ac]';

/** The headline's key word: the existing #c44a8c in light (it passes contrast), highlightpink in dark. */
export const ACCENT = 'text-[#c44a8c] dark:text-highlightpink';

/** A small rounded chip. */
export const CHIP = 'rounded-full bg-maroon/5 px-2.5 py-0.5 text-xs text-[#3d2f42] dark:bg-white/[0.08] dark:text-gray-200';

/** What each OAuth scope lets an agent do, in the approve page's words. */
export const SCOPE_LABELS: Record<string, string> = { 'mcp:tools': 'Read Music Nerd' };

# Profile edit affordance — #1308

September 21, 2026. Local review, not released.

Carl suggested “Edit profile” in the September 21 standup (07:45–09:04,
transcript PR #1318). Pete subsequently requested trying that label together with
pink outlines/glow around editable components. This is the selected local experiment,
not a claim that highlights were agreed in the meeting.

The entry button reads **Edit profile**, including on phones. Active mode keeps the
existing Done/Saving actions. A steady pink outline and soft glow identify the
photo/About header, Links (including Support), Lore, and the owner-only knowledge
editor. Public viewing and non-editable Latest content do not receive the treatment.
Highlights communicate scope without adding nested edit buttons or changing saves.

Use existing EditModeContext and component roots. Do not remount child editors,
add click targets over their controls, or change layout dimensions. Existing field
permissions, saved drafts, section-specific actions, Done/save-failure behavior,
server routes, database, jobs and providers remain unchanged. This branch does not
include the separate #1307 photo-repositioning work.

Verification: check desktop/mobile and both themes, entry/exit, visible button label,
no horizontal overflow, focus, and existing biography/link-order save regressions.
The local fixture route demonstrates real UI components without account writes;
real authenticated production editing is not demonstrated by that preview.

Local results: full npm run ci passed (252 suites, 2704 passing tests, 6 skips;
typecheck, lint with existing warnings, stub-env production build). Chromium and
WebKit at 390/832, light/dark: visible label, four scoped highlights, no Latest
highlight, draft retained through theme changes, Done clears highlights, no overflow.
Preview uses the real header/toggle/link controls and shared section component;
Lore/knowledge editor contents are fixtures. No real profile write was exercised.

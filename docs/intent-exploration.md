# Conversational artist canvas — preview experiment

## Decision and status

Pete clarified that generative UI must evolve with the conversation, not choose among three prepared pages. The initial page-mode prototype (`60b3237`) is superseded. Its branding and evidence components are reused, while its router is removed. The preview now maintains one compositional canvas with stable block IDs, a conversation and independent pin/selection/focus state.

Replay mode is explicitly labeled and makes no model calls. It uses authored responses through the same AI SDK UI-message protocol and client validator as the prepared live mode. It demonstrates the renderer and state transitions, not general model reasoning. Live execution is enabled on the isolated preview branches after explicit approval, under a shared $20 overnight maximum. Do not call the replay a generative model demo.

## Existing infrastructure and minimum extension

Web uses the same `useChat` / `DefaultChatTransport` path as AskAboutArtist. Its preview-only live endpoint is the isolated MusicNerdAPI deployment, never production. API extends existing `/api/artist/{id}/chat`, uses the existing `MODEL_CHAT` constant and `lib/ai/streamText`, public research originals, shared ranking, source reading, citation writer, Privy visitor key and hourly question allowance. No new provider SDK, credentials or duplicate chat endpoint. Ordinary requests without `canvas` remain unchanged.

Current API main examined: `e4054a4`. `MODEL_CHAT` currently names `anthropic/claude-sonnet-5.5` via the existing gateway. This is an observed configuration, not a provider choice for this experiment. Live multi-turn conversations for both artists have been verified in the browser.

## Contract: canvas.v1

Request adds optional `canvas` beside existing `messages`: version, UUID sessionId, UUID turnId, integer baseRevision, prior spec, pinnedIds, selectedIds and focusId. A spec contains at most eight blocks with stable id, kind (`timeline`, `cards`, `media`, `quote`, `comparison`, `document`), short presentation title, at most eight evidence IDs, and span 1 or 2. No HTML, executable code, URLs or new factual payloads appear in a spec.

The model proposes a full nextSpec via `composeCanvas`. Server validates against server-owned seed/read-source evidence, rejects duplicate block IDs, unknown evidence and invalid kind/evidence pairs, and enforces pinned-block equality and relative order. It computes added/updated/removed IDs. A complete `data-canvas` part is staged until the entire model turn succeeds, then emitted with revision+1, echoed session/turn IDs, nextSpec, evidence and changes. Client validates again and only commits on successful stream completion for the pending revision. Cancellation/failure preserves prior canvas. The server does not persist sessions; the browser is the revision owner, with a single in-flight turn. Reload restores bounded artist-scoped tab state. This is not multi-device persistence or a durable session guarantee.

Only `readSource` can register additional stored public evidence. Source URLs are protocol-checked; its display text is a bounded excerpt, not a model-generated claim. InProcess metadata is decoded into a readable title and description. External collection/web search is disabled for canvas turns. Additional sources are source cards; generated quotations or inferred event dates are not accepted. Authored seed quotations are attributed, and source-publication dates are distinguished from release dates.

## Evidence foundation and environments

Production identity/profile: `3cd4c3e4-4bf4-4b92-9b72-07f9188bd4c6`. Staging retrieval identity: `73488cf7-3d3f-46ac-8cb1-74424c162ed6`; both verified via public search, matching callmelatasha accounts. The public profile's 13 Lore sources, Latest entries and artist-owned Bandcamp/official media pages were inspected October 29, 2026. The seed includes Teen Nite at Empire (2017 release), PAST LIFE (2020 collection, older recordings), MEDS BY TASH (March 5, 2021), ZORA interview (September 7, 2021 publication), OUT HERE (September 25, 2026), official film/process media, and an exact attributed quotation. No causal relationship is inferred from proximity in time.

Portrait comes from the Music Nerd public custom image. Album art is the artist's Bandcamp artwork; video thumbnails match the official videos linked by callmelatasha.com/media. MEDS artwork was reverified against its exact Bandcamp album page on October 29: `#tralbumArt img` uses `https://f4.bcbits.com/img/a1463028126_2.jpg` (the artwork itself says “RIDE YOUR WAVE”). This is the release page’s chosen artwork, not an inferred thumbnail. Every item links to its source. Source snapshot is neither exhaustive nor current/live.

## Live gates

API: only Vercel preview, only the two allowlisted staging artist IDs, and `MUSICNERD_CANVAS_PREVIEW_ENABLED=1`. Otherwise a canvas request returns 503 before artist/source reads or quota reservation. Web live mode additionally needs the same flag and `MUSICNERD_CANVAS_API_PREVIEW_URL` matching the isolated Music Nerd API preview host. Absent flags use replay. Flags are scoped to these preview branches. Existing visitor quotas are supplemented by a shared, advisory-locked $18 ledger with $1 reservations and conservative settlement of confirmed usage, no retries, four model steps, bounded context/output, and a deadline. See API CANVAS-PREVIEW.md for the conservative pricing calculation. No production DB mutations, research jobs or provider refreshes are introduced by replay.

## Acceptance flow

Career question adds a timeline. Independence follow-up updates that timeline's existing ID and places artist voice beside it. “What was she releasing then?” preserves those blocks and adds the 2021 listening card. Add visual work, then keep the timeline, compare two releases and remove videos. Pinning protects a block; selected evidence informs comparison. Authored replay supports only disclosed prompts. Offline mock-model integration also verifies an unseen comparison-plus-process arrangement, independent of replay routing.

## Research references

- C.Y., October 26 standup, normalized timeline and visitor-intent discussion.
- Dutchyyy PDF: https://arweave.net/CFpCbipP6-Bi-Iwr0tyo2oIP9AIMZnOg6IUq21kz8JM — progressive depth and preservation of artist corrections, not LATASHÁ facts.
- https://json-render.dev/docs/specs — structured, schema-bound presentation.
- https://json-render.dev/docs/streaming — patch streams; this prototype instead validates a full nextSpec before committing.
- https://json-render.dev/docs/registry — authored component vocabulary; no new dependency required for the bounded overnight renderer.

Tracking issue publication was denied by automatic approval review. User subsequently said a new public issue was unnecessary; it is not retried. Preview branch publication is authorized. No main merge or production promotion.

## Overnight iteration · October 29

The user authorized live tests through the existing chat/API with a $20 total overnight cap. API branch codex/intent-composition adds a shared reservation cap and bounded model steps/output, leaving headroom. No new credentials/provider, no production release. Web branch uses branch-specific server environment configuration to point at the isolated API preview.

Dutchyyy added to the same renderer, protocol and conversation state. Production profile efff5473-fa9f-4eba-b137-16ffb79f15d8; staging profile 6cb3d81a-3d02-4c57-a711-bb7902a9af1b. Three public Lore PDFs: 41-page full archive, 19-page shorter archive, 13-page incomplete chronological discography. Selected PDF pages visually inspected. Artist preface distinguished from document claims; recording dates remain distinct from release dates. No claim that all staging PDF text is extracted. Existing live retrieval has returned real Instagram captions and InProcess work descriptions for Dutchyyy; these were used in a successful composition. The preview additionally verifies public profile download links and retrieves physical pages from the 19-page archive and 13-page discography. The 41-page archive remains excluded. Extracted document narratives are not assumed to be artist quotations; each passage retains its page and attribution limitations.

The existing home and search remain unchanged. In this isolated preview, selecting any artist opens `/artist/{id}/explore`; `?view=profile` retains access to the original profile. Artist changes remount the session and clear conversation, pins, selection and canvas, preventing attribution leakage. A source-backed starting work is visible before the first model turn. Replay remains explicitly labeled and freeform routing is only offered with the live preview enabled.

## Verification and known limits

Live Dutchyyy sequence: PDF + InProcess + direct Bandcamp work, add timeline with pinned PDF, compare selected records and remove InProcess while retaining pins. Live LATASHA sequence: timeline + quote + listening, focus2021 + undated visualwork, then clarify interviewpublication versus unverified jobstart and removevideos. Source inspection opens exact PDFpages and renders selected original-page previews. Search carries intent into the chosen artist's conversation.

Offline checks cover stale revisions, old-turn completions, invalid evidence IDs/URLs, pinned movement, cross-artist seed isolation, atomic completion, and selection/focus after removal. Full suites passed before subsequent focused regressions (Web3635, API4451); latest focused tests and type/lint checks also pass.

Artist routing and stored-source generation are generalized; autonomous paid evaluation has covered only LATASHA and Dutchyyy. Curated evidence is a snapshot, additional stored sources may be incomplete, source captions are not video transcripts, and the model can still make mistaken interpretations in prose. The canvas contains server-owned evidence. No Spotify refresh, production mutation, main merge or production deployment. Reload restores the current tab session; artist sessions remain isolated.

Junk Planet artwork is sourced from the exact artist Bandcamp album linked by its workUrl, verified October 29: `#tralbumArt img` points to `https://f4.bcbits.com/img/a1141999039_2.jpg`. Clicking that artwork opens the work; the PDF source controls continue to open the cited discography page.

Budget settlement retains historical reservations at $1 and only credits newly confirmed complete usage at conservative $3/M input and $12/M output. Failed, aborted, unknown or out-of-bounds usage retains $1. Original reservation rows remain, so older deployments still enforce their attempt guard. No new credentials or production writes.

## Completion and session refinement

Composition now requires a bounded completed explanation, committed with the validated canvas. The client displays that explanation instead of draft or empty streamed prose, retaining verified citation links. Pinned objects keep their contents and relative order among pins; removing preceding unpinned content does not require filler.
The Web preview saves bounded, validated canvas state and text/source conversation parts in tab-scoped sessionStorage, keyed by artist, mode and version. No credentials/tool payloads or server persistence. Reload resumes the same artist; switching artists keeps separate sessions; Reset exploration clears the current exploration. Closing the tab ends the session. Stored data is untrusted and parsed before restoration.

## October 29 morning integration correction

Pete asked to adapt the live home/search rather than replace it, make mobile results visible, and open as a helpful first conversational answer. The old experiment entry redirects home. The existing artist route redirects to exploration only on the flagged preview; production and explicit original-profile links are unchanged.

Preview-only GET `/api/artist/{id}/canvas` validates the UUID, reads artist identity, the eligible public profile bio and existing public research sources. It returns bounded evidence, a verbatim bio excerpt, up to three source-derived starting objects and a natural follow-up question. No model invocation, provider refresh, extraction job or write occurs on page entry. An unavailable corpus has an explicit fallback. Public bio uses the same claim/directory eligibility as the profile; draft bios are not exposed. A limited fixture supplement remains for the two evaluated artists, with no supplement borrowed by other artists.

Instagram own-post thumbnails are projected from already retained, validated storage records matched by exact source URL. Unverified raw CDN images are not used. Client cards show the image and Open post, or an explicit unavailable-image fallback. No new scrape or oEmbed integration.

On mobile, the canvas precedes a fixed bottom composer with safe-area and visual-viewport keyboard offsets. Conversation history lives in a dismissible sheet. The first completed result is revealed unless the user is inspecting the canvas; later changes offer View changes and focus the changed block. Draft text survives failure. Pins, source disclosure and artist-scoped session state remain independent of conversation display.

Generation uses the same existing preview chat handler for any artist, with the existing quota, model and shared budget checks. This does not broaden autonomous test permission beyond the two approved artists. In-experience media playback remains an audited follow-up: external listening/post links work, but no embedded player has been added.

## Continuous shell and expanded October 29 evaluation

The flagged preview reuses the original home composition inside a persistent root shell. One actual SearchBar input stays mounted, retains its query/focus, and moves between measured home and header anchors. The manifesto clears while the artist surface occupies the space. This is not a duplicated search element or a full-page fade. Reduced-motion disables movement. URLs/deep links still identify the artist; Back reveals home while retaining the artist component and unfinished composer in the same shell. Switching artists remains intentionally isolated.

The artist route registers public bootstrap data with that shell. Production keeps its original layout and route behavior. The opening uses eligible public biography where present, otherwise a source-bound orientation through documented work and attributed voice. It does not expose draft bios or claim to generate a canonical biography. ISO publication dates display as readable UTC calendar dates; uncertain ranges and year-only precision remain unchanged.

Pete explicitly approved public-source tests for other artists through October 29 Eastern, under the SAME cumulative $20 including overnight. The existing preview window now ends October 30 at 04:00 UTC; the existing $18 shared ledger, conservative reservations/settlement and extra $2 headroom remain unchanged. The bootstrap exposes only an aggregate budget read, not reservation details. No reset, new credentials or provider.

### Evidence presentation quality (October 29)

Known stored release metadata is projected into labeled title, explicit artist name when present, release type, and date with its original precision. Account IDs never become artist names. These fields are labeled provider metadata, not quotations. Unknown or malformed storage JSON retains only a source link. Website navigation prefixes are excluded from new excerpt selection while retaining original source offsets for citation reconstruction; recognized discography/gallery URL paths receive page-purpose titles. Previously saved opaque payloads are suppressed in the renderer without rewriting their stored evidence or pins.

Opening invitations and clickable replies derive from the same readable sources, preferring documented works and discography over generic website names. The Dutchyyy orientation now includes the alias/role relationship documented on physical page 1 of his public discography before the listening foothold. No new model calls or production data writes are required. Preview search remains on staging: no explicit fixture metadata exists in the current artist/search schema, and swapping only search to production would mismatch IDs with staging identity/retrieval. No name-based filtering is introduced.

### Bottom-composer demo revision (October 29, before 1 PM EDT)

All viewport widths use one fixed bottom composer, with previous turns in an on-demand Conversation sheet. The latest answer appears above the evolving content; desktop has no permanent chat sidebar. The opening retains one source-backed invitation and at most two matching replies, without a second generic prompt set. First-result reveal works at every width while respecting source inspection; later View changes remains explicit. The original home/search shared element and navigation semantics are unchanged.

Block chrome is reduced to a title and an accessible Actions menu (pin, expand, remove); the starting block label and redundant kind/count labels are hidden. Menus are nonmodal so removal can return keyboard focus to the composer without trapping it. Pinned state remains visible and prevents removal. Conversation history, source disclosures, undo, selection, session restoration and error handling remain available. This revision adds no retrieval/polling/backend changes and no playback feature.

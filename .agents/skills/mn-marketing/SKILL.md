---
name: mn-marketing
description: 'Make short videos that get artists to claim their Music Nerd profile: announce a shipped feature, highlight an artist who uses Music Nerd, or show how claiming works. Runs the whole slate: pick what to feature from merged PRs and claimed artists, script, $0 drafts, finals, publish through Opus, and measure claims. Use when asked for "Music Nerd marketing", "a video announcing <feature>", "highlight <artist> on Music Nerd", "get more artists to claim", or "this week''s Music Nerd videos". Not for Recoup''s own marketing (that is recoup-internal-marketing, whose video mechanics this skill reuses).'
---

# Music Nerd marketing

## The goal

> **An artist watches, then claims their Music Nerd profile, and we can tell which post did it.**

Every video ends on one action: **claim your profile at musicnerd.net**. Views are a leading indicator; claims
are the result. If a run cannot measure claims, say so in writing.

## Step 0: prerequisites, accounts and workspace

**Requires the `recoup-internal-marketing` skill** for the shared video mechanics
(`npx skills add recoupable/skills`). **Presenter:** Sarah, a dedicated Music Nerd character (owner ruling
2026-09-28), built with that skill's `references/character-sheet.md`; never Recoup's Jenny. A text-led piece
(see *Text-led UI motion graphic* below) needs no presenter. **Reference projects:** see *Product demo scenes*
and *Text-led UI motion graphic* below.


Videos post from the account owner's personal socials (approved by Pete and CY). Account ids, the post log and
drafts live in the owner's **account workspace** (its `ACCOUNT.md` and `posts-log.md`), never in this public
repo. Tag Music Nerd posts in the log with the arc `Music Nerd`.

## Step 1: read before building

1. `DESIGN.md` → **Brand for media**: logo, headline style, the action pink, charcoal glass, type, voice, the CTA.
2. The `recoup-internal-marketing` skill's `references/video-pipeline.md`, `voice.md`, `hooks.md` and
   `opus.md`: the shared mechanics (composition from the audio, the 4:5 safe zone, B-roll, lip-sync, Opus).
   This skill only adds what is specific to Music Nerd.
3. The account workspace's `posts-log.md` tail, for what already shipped and how it did.

## Step 2: read the funnel first

One number opens every run: **claims since the last run**. Sources: the admin claims table, and the
`claim` analytics event (`step: "submitted"`) in Vercel Web Analytics. Then tagged visits by
`utm_campaign` from the same Vercel project. A visit-to-claim join does not exist yet; say so.

## Step 3: pick what to feature

Three kinds, one idea per video:

| Kind | Source | What the artist learns |
|---|---|---|
| **Feature launch** | a merged PR on `main` (`gh search prs --repo xdjs/MusicNerdWeb --merged-at=">=<date>"`) | what their profile now does for them |
| **Artist highlight** | a claimed artist's live profile | what a claimed profile looks like, from a peer |
| **How to claim** | the claim flow itself | exactly how long it takes and what they get |

Gates before building:

- **Live, not merged.** Announce a feature only after its merge SHA is in production (the
  `production-release` run for that SHA succeeded; `docs/releases.md`). A merge is not a release.
- **Every claim checked against what is live, line by line.** Read the live product (for the docs, `/llms.txt`
  and the page itself), not the plan or the issue. 2026-10-05: "AI reads your profile" was cut because the read
  endpoints were still an open PR; the line became "apps and agents can run the research", which was live.
- **A developer-facing feature still needs an artist-side why.** An artist does not claim because the docs look
  better. Find the control only a claimed artist has and make it the turn of the script (2026-10-05: Look again
  is "Claimant or admin.", so "only you can tell it to look again." → "claim your profile.").
- **Consent for a highlight.** The artist has said yes to being featured, and is invited to co-post
  (collaborators widen reach). No consent, no highlight; use the how-to-claim kind instead.
- **Real numbers only**, from the artist's page or our own data, never estimated for effect.
- **Why, theirs first:** one sentence on what the artist watching gets, one on what Music Nerd gets.

## Step 4: build (draft first, spend last)

Same order as `recoup-internal-marketing` Step 4; every stage is a file the owner opens before the next.

1. **Ideas table** for the slate: kind, the proof, the source, consent status. Owner approves rows.
1b. **Style reference, approved before any build.** Browse the gallery at
   **https://skillry.dev/ai-videos/opus-5-5** (each page has the video and its prompt; the MP4 is at
   `https://media.skillry.dev/opus-5-5/<slug>/original.mp4`). Pull frame sheets of two or three candidates, pick
   one, and send the owner **its link** with why it fits; build only after the owner approves that reference.
   Approved so far: wustep's Notion "Column permissions" trailer
   (https://skillry.dev/ai-videos/opus-5-5/wustep-884086) for the text-led UI format.
2. **Script**, ~70 words for ~30s, in Music Nerd's voice (lowercase, friendly, speaks to the artist as
   "you"). Hook in 3s. End on the CTA line. The owner approves the on-screen text, and any spoken-only line
   (an end card read aloud), before anything renders.
3. **Voice.** A presenter piece uses the presenter's canon in the account workspace (`cast/`). When the owner
   narrates, follow *Owner voiceover* below.
4. **$0 draft**: still presenter, VO, **the real UI** (claim button, research view, found-profile cards,
   the artist's live page), captions in the 4:5 safe zone. Owner reviews.
5. **Generated video after approval only**: presenter clips, one live-action B-roll plate.
6. Composite, snapshot, render, frames read from the MP4 and in the 4:5 crop.

**Look:** dark charcoal glass on `#1a1a1a`; headlines in the homepage manifesto style (grey, key words in
`#ff75d8`); the CTA pill in the action pink `#ef95ff` with black text; cyan and mint as small accents; the
spectacles logo; round shapes; calm motion. End card: logo, "claim your profile", `musicnerd.net`.

## Product demo scenes (owner, 2026-09-28: "static web page images put me to sleep")

**Every product demo runs on the 3D iPhone** (owner, 2026-09-28): search, claim, the DM with the code, and the
research view that builds the page. The phone is the GLTF iPhone from the `vfx-iphone-device` registry block with the
**real production captures drawn onto its screen** as a canvas texture (the block's live-HTML capture needs a newer
renderer than `hyperframes@0.7.5`). Never a parked screenshot with a slow push; every beat is a named move, tied to
the word that names it:

| Beat | Moves |
|---|---|
| Entry | crash-in from a turned phone |
| A step (search, claim, submit, send) | push to the element being named, tap ripple painted into the screen, zoom-through swap at peak speed |
| Between steps | one bold transition (a spin), the rest hard cuts |
| A message or code | push onto the bubble as the VO says it, tap glow on the key word |
| Web view (research view) | the phone capture of the page, push to the region being named, swap on the result |
| Exit | whip out before the presenter returns |

Doctrine (from the `product-launch-video` and `hyperframes-animation` skills): fast `power3` push, then hold; reveals
land on the VO word; one bold transition, the rest hard cuts at peak velocity; nothing drifts slowly. Fade the
chrome while the phone fills the frame. Keep everything read inside the 4:5 safe zone.

**Screen layout, the same on every screen** (owner, 2026-09-28): a status bar and the header fully below it, never
cramped against the top edge; the page cut at the last whole line that fits, so the bottom edge has breathing room and
no line is split; fixed controls (the Ask button) moved inside that area; a message screen shows the keyboard, with the
input above it. The reference project's generator frames every capture this way; add a capture there, not by hand.

**Captures:** iPhone 16 Pro in the browser (3× density), **signed out** so no admin controls show, and never press
Submit Claim (it files a real claim). **Type:** the renderer cannot load the system font the site uses, so video type
is Inter. **Captions:** merge spoken URLs and handles back to `musicnerd.net` and `@musicnerdxyz`.

**Reference project:** the first how-to-claim short, in the owner's account workspace
(`content/mn-claim-howto/`: the themed engine, the 3D phone generator, the captures). Clone it.

## Text-led UI motion graphic (approved 2026-10-05)

For a web feature (the docs, a desktop page) the 3D phone is the wrong frame. This format has no presenter: the
real UI rebuilt in HTML from the approved design boards, a camera that pushes into one element per beat, and a
bold few-word headline per beat (key word in pink). Reference video: the wustep Notion trailer above. Reference
project: the docs launch short in the owner's account workspace (`content/mn-docs-design-launch/`: `SCRIPT.md`,
`VO-GUIDE.md`, `video/index.html`, `video/gen_bed.py`, `video/gen_vo.py`, `video/mix.sh`). Clone it.

- **Build the page once, film it with a camera.** Lay the page out at its native width with every element at
  the board's coordinates; a `cam(px, py, scale)` helper centers any page point in frame. Assemble it piece by
  piece, then push to the element the headline names.
- **Colors as CSS variables** so the page's own theme toggle can flip light to dark as a beat; end on the
  charcoal end card (logo, "claim your profile", the pink `musicnerd.net` pill).
- **Real UI and real responses only**: response bodies from the docs' own examples, tokens masked.
- **Music bed** synthesized for $0 (`gen_bed.py`: pad, arpeggio, kick from the reveal, whooshes on cuts, clicks
  on taps); VO ducks it.
- **Snapshot QC** adds two checks: no headline leaves one word on its own line, and a zoomed page never shows a
  hard stage edge (the stage is full frame; a gradient backs the headline).

## Owner voiceover (2026-10-05, about $0.06 a video)

1. **Reference read**: ElevenLabs **eleven_v4**, any voice, one call per line (`gen_vo.py`), placed on each
   beat's mark. Write `VO-GUIDE.md`: each line, its start time, the reference length and the latest it may end.
2. **The owner records one take on a phone**, all lines in order.
3. **Cut it by word timestamps** from ElevenLabs Scribe (never Whisper), padded 0.1s before and 0.3s after.
4. **Enhance**: ElevenLabs Voice Isolator on the whole take (rain and construction gone: noise floor -44 → -76 dB),
   then cut, high-pass at 80 Hz, and gain each line to **-20 LUFS** (a quick phone take drifts ~8 dB with distance).
5. **Mix**: `mix.sh <out.mp4> <line dir>` lays the lines on their marks, ducks the bed, and normalizes to -14 LUFS.
   Transcribe the final file once to confirm each line lands inside its beat.

## Step 5: publish and measure

- Publish through Opus per `recoup-internal-marketing` → `references/opus.md`, after the owner's go-ahead.
- Link `https://musicnerd.net` (the primary domain since 2026-10-05; `docs.musicnerd.xyz` redirects to the app, so
  link the docs at `musicnerd-docs.vercel.app` until they have a domain) with
  `?utm_source=<yt|tt|ig|x|li>&utm_medium=social&utm_campaign=mn-<slate>-<item>`.
- Log each post in the account workspace's `posts-log.md` with its kind, the artist (if any) and the why.
- **~48h re-pull:** views, tagged visits and claims since the post. A written zero is a finding.

## Guardrails

- Nothing publishes without the owner's explicit go-ahead.
- No feature shown before it is live; no artist shown without consent; no invented UI or data.
- No private data from the app (emails, unclaimed-artist contact details, admin screens) on screen.
- Keep account ids and personal paths out of this repo.

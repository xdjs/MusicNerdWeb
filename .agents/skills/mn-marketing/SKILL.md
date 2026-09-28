---
name: mn-marketing
description: 'Make short videos that get artists to claim their Music Nerd profile: announce a shipped feature, highlight an artist who uses Music Nerd, or show how claiming works. Runs the whole slate: pick what to feature from merged PRs and claimed artists, script, $0 drafts, finals, publish through Opus, and measure claims. Use when asked for "Music Nerd marketing", "a video announcing <feature>", "highlight <artist> on Music Nerd", "get more artists to claim", or "this week''s Music Nerd videos". Not for Recoup''s own marketing (that is recoup-internal-marketing, whose video mechanics this skill reuses).'
---

# Music Nerd marketing

## The goal

> **An artist watches, then claims their Music Nerd profile, and we can tell which post did it.**

Every video ends on one action: **claim your profile at musicnerd.xyz**. Views are a leading indicator; claims
are the result. If a run cannot measure claims, say so in writing.

## Step 0: accounts and workspace

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
- **Consent for a highlight.** The artist has said yes to being featured, and is invited to co-post
  (collaborators widen reach). No consent, no highlight; use the how-to-claim kind instead.
- **Real numbers only**, from the artist's page or our own data, never estimated for effect.
- **Why, theirs first:** one sentence on what the artist watching gets, one on what Music Nerd gets.

## Step 4: build (draft first, spend last)

Same order as `recoup-internal-marketing` Step 4; every stage is a file the owner opens before the next.

1. **Ideas table** for the slate: kind, the proof, the source, consent status. Owner approves rows.
2. **Script**, ~70 words for ~30s, in Music Nerd's voice (lowercase, friendly, speaks to the artist as
   "you"). Hook in 3s. End on the CTA line.
3. **Voice** per the recurring presenter's canon in the account workspace (`cast/`).
4. **$0 draft**: still presenter, VO, **the real UI** (claim button, research view, found-profile cards,
   the artist's live page), captions in the 4:5 safe zone. Owner reviews.
5. **Generated video after approval only**: presenter clips, one live-action B-roll plate.
6. Composite, snapshot, render, frames read from the MP4 and in the 4:5 crop.

**Look:** dark charcoal glass on `#1a1a1a`; headlines in the homepage manifesto style (grey, key words in
`#ff75d8`); the CTA pill in the action pink `#ef95ff` with black text; cyan and mint as small accents; the
spectacles logo; round shapes; calm motion. End card: logo, "claim your profile", `musicnerd.xyz`.

## Step 5: publish and measure

- Publish through Opus per `recoup-internal-marketing` → `references/opus.md`, after the owner's go-ahead.
- Link `https://www.musicnerd.xyz` (the bare domain does not resolve) with
  `?utm_source=<yt|tt|ig|x|li>&utm_medium=social&utm_campaign=mn-<slate>-<item>`.
- Log each post in the account workspace's `posts-log.md` with its kind, the artist (if any) and the why.
- **~48h re-pull:** views, tagged visits and claims since the post. A written zero is a finding.

## Guardrails

- Nothing publishes without the owner's explicit go-ahead.
- No feature shown before it is live; no artist shown without consent; no invented UI or data.
- No private data from the app (emails, unclaimed-artist contact details, admin screens) on screen.
- Keep account ids and personal paths out of this repo.

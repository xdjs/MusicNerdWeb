# Retro log

Keep / fix / try, week by week. Newest first. Open commitments live at the bottom and carry
forward until they're done or dropped.

---

## September 9 engineering cycle — input for the next retro

Pete requested this handoff after the profile-release review; these are engineering lessons,
not decisions attributed to a future team meeting.

- **Keep:** real app-role/concurrency tests, artist-data preservation checks, clear Carl merge gate.
- **Fix:** narrow patches missed neighboring callers; stale handoffs and treating every review
  suggestion as a blocker prolonged the release.
- **Try:** audit the whole affected flow once, batch code/security findings, and stop when
  verified release blockers are cleared. Defer optional work; rebut incorrect findings with evidence.

[Current release, evidence and stopping rules](../development/profile-release-handoff-2026-09-09.md).

## Follow-through checked 2026-09-09

The [August 27 meeting](meetings/2026-08-27.md) moved retrospectives to a separate session and
introduced daily standups. No later standalone keep/fix/try record was found in this sweep;
standup discussion is not being relabeled as a retro.

- Substack publication was confirmed August 27; a further community-session post was reported
  [September 7](meetings/2026-09-07.md). The old access blocker is no longer an active commitment.
- Event format evolved from monthly sessions to an every-other-week showcase, later Feed
  Forward. See [event context](events/README.md); the original date-picking task is superseded.
- Discord cleanup was discussed through [September 8](meetings/2026-09-08.md). This supports
  ongoing work, not a claim that all cleanup or regular agenda/retro posting is complete.
- Reel publication, regular In Process use, Riverside plan verification and a genuinely cold
  artist test have no confirmed completion in the reviewed sources.

## 2026-08-20

Not run live — the meeting ran long and the retro happened over text afterward. CY's fix this
week is directly about that.

**Carried in from the prior week:** the fix was "not enough information radiators." The tries
were (1) use a ChatGPT group chat, (2) demo the week's work at the start of the meeting.

**Keep**
- Demo at the start of the meeting.
- The generated agenda.

**Fix**
- New Music Nerd energy isn't visible. (Carl)
- Start the retro earlier, not against the end of the call. (CY)

**Try**
- Use the Music Nerd Discord channel to publish the agenda before the meeting and the retro
  after it. (Carl)
- Pete uses In Process a few times a week. (CY)
- Maintain context via markdown in the project repo — replaces the ChatGPT group chat, which
  everyone agreed didn't work. (Carl)

**Verdict on last week's tries:** the group chat is dead. The demo-first format and the
generated agenda both worked and became keeps.

---

## Open commitments

Carried until closed. Owner in brackets. Checked items retain closure evidence; unchecked items
have not been confirmed complete in the reviewed sources.

### Visibility — "new Music Nerd energy"
- [x] Resolve Substack access and publish a post. Publication confirmed in the August 27
      meeting; see follow-through above. [Pete]
- [ ] Publish a reel about the new role. [Pete]
- [ ] Start using Discord regularly; agenda before the meeting, retro after. [Pete]
- [ ] Start using In Process a few times a week. [Pete]

### Roundtable & showcase
- [x] Choose the initial event format and schedule. Superseded by the every-other-week
      showcase/Feed Forward plans; confirm upcoming dates in the calendar. [Pete]
- [x] Establish the initial community-session concept. August 24 showcase planning and later
      Feed Forward discussions supersede the original separate-roundtable concept. [Pete]
- [x] Obtain the community mailing list. Receipt/use reported September 7; the list remains
      private. [Pete, Jade]
- [ ] Check Riverside pricing and report back if it needs a paid plan. [Pete]

### Product
- [ ] Run Pharaoh through onboarding cold — no coaching, no narration, no explaining.
      Report what breaks. [Pete, 8/21]

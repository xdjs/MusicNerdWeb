# Ask About review — 2026-10-10

Refs MusicNerdWeb#1424. Public Ask About only; private artist interviews are unchanged.

## Findings and fixes

| Stage | Finding | Change |
|---|---|---|
| Interpret question | Latest overview and latest individual post used one retrieval intent | Explicit overview/focused scope; same-video follow-ups retain their citation |
| Select originals | Three newest candidates could all cover one activity; assessment could stop at one source | API considers six saved windows within the same 12,000-character budget, selecting up to three useful originals |
| Draft | Instructions explicitly favored date-first post attribution and filenames | Activity-first prose, concise sentences, useful examples, grouped related activity |
| Check | Factual support alone was mistaken for answer quality | Keep factual checking; separately inspect usefulness, readability, qualifications, and repetition |
| Replay | Same job/question could return old wording after a prompt update | New registrations use a versioned fingerprint; in-flight legacy registrations resume without resetting attempts, limits or expiry |
| Failure copy | Robotic unsupported-answer wording | Short direct missing-information wording; no model-written absence claims rendered |

The shared API path is enabled by MUSICNERD_RESEARCH_API_KEY. The older configuration
fallback was inspected but not treated as proof of this path, and is unchanged.
Public conversation contributes up to four turns for reference resolution, not
factual evidence or private interview memory. No additional model stage was added.

## Evaluation

The initial paired before/after run used public DUTCHYYY post wording and two
fictional held-out cases: separate song-arrangement/workshop activity and an
unfinished search for a WAV. Six draft/check pairs passed exact quotes and the
factual checker. Editorial inspection found the old versions led with metadata;
the new ones led with activity and retained the missing-release-date and
unfinished-search qualifications. A later wording pass removed inferred gender
and tightened sentence guidance. The model checker is not editorial acceptance.

Final fixture-run measurements before the last short-sentence guidance refinement:

| Case | Draft + check latency | Total tokens | Factual checks |
|---|---|---|---|
| archival-overview | 17.83s | 6943 | exact quotes pass; checker accepts |
| heldout-two-activities | 7.05s | 5550 | exact quotes pass; checker accepts |
| heldout-search-qualification | 6.48s | 4575 | exact quotes pass; checker accepts |

Token usage is recorded as a cost proxy; exact billed dollars have not been reconciled.
No false rejection appeared in this small sample; it does not establish a rate.
Repetition across real follow-up turns still requires browser verification.
Reproduce the paired fixture run with `npx tsx scripts/eval/ask-response-quality.ts`
using an externally configured AI Gateway credential. Results default to /tmp.
Fixtures are diagnostic inputs and never published as artist knowledge.

The real DUTCHYYY API overview completed in 3.94 seconds and selected three
originals: the 2013 Ape Escape flip, a 2013 phone voice memo, and recovered
2002–2005 MySpace beat snippets. The real Web original-read/draft/check pipeline
then completed in 24.17 seconds after the final refinement, retaining all three
exact source references. It described archival sharing, not three new projects.
No source refresh or budget reset was used. The original WAV post does assert
no uncompressed copy exists and then says the artist keeps searching; its claim
must remain attributed.

## Limits retained

Stored provider coverage is not a comprehensive live sweep. URL-based exclusions
can hide multiple public answers sharing one profile URL. External collection
keeps its existing candidate budget. Unit tests establish bounds and routing,
not general editorial quality. Release verification is recorded on the PR.

Cross-deployment recovery was checked with compiled SQL selection assertions:
current-policy registrations take priority over legacy exact-question registrations;
legacy leases and result writes retain the selected hash. Exhausted legacy attempts
stay exhausted, and verified legacy answers still require eligible original evidence.
This replaces the earlier expected-409/resubmit behavior for in-flight requests.

## Final browser finding: excluded projects

The exact preview returned a different archival post when asked for activity besides
the archival posts. The planner had reduced the named Searching For A Save Point
project to a generic exclusion; URL exclusion alone did not identify another post
from that project. The planner now retains named project boundaries from permitted
public history, and draft/check instructions reject other details from excluded
projects. The API assessment reinforces that boundary. A live planner replay
resolved the exclusion to the actual project name. Held-out checks with only an
excluded project returned no factual sentences; a mixed fixture checks that an
unrelated activity remains answerable. These narrow fixtures do not establish a
general semantic exclusion success rate.

A second browser run exposed a narrower failure: the concise answer omitted the
collection name, and the planner replaced “besides the archival posts” with the
three recordings mentioned. That allowed other archival recordings through. The
planner now preserves the entire excluded category even when no collection name
is available, adding named examples without substituting them for the category.
The captured real conversation is reproducible with
`npx tsx scripts/eval/ask-followup-scope.ts`; the corrected real-model plan retained
archival posts in both request fields (1.235 seconds). No quota was reset.

LATASHA's final-preview overview found originals but failed at claim checking. An
unchanged-source replay exposed draft/checker asymmetry: the draft expanded credited
handles into identities, which the checker correctly rejected. That replay repaired
successfully; it does not reconstruct the failed deployed second draft. The writer
now mirrors the existing exact-handle and credit-role rules and leaves unnecessary
credit lists out of broad updates. The real-original replay passed on its first
attempt in 10.8 seconds. A held-out credit/ambiguous-project case used the existing
bounded repair to remove a false connection (24.8 seconds). The evaluation runner
now retains both attempts and uses the same two-attempt, 45-second limit.

The final integrated DUTCHYYY replay reached the existing saved-source quota. Its
corrected planner and API evidence stages passed separately; no quota was reset.
This limit is recorded separately from a successful full-browser replay.

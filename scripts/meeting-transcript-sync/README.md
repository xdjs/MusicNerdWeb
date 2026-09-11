# Google Meet → Music Nerd transcript sync

Publishes the full **Transcript** tab from Google-generated Docs attached to Calendar events
named exactly **Music Nerd Stand Up** or **Music Nerd R&D**. Pete explicitly authorized public
verbatim transcripts for these two meetings on September 10, 2026. This exception does not
include artist interviews, design sessions, unrelated attachments, or all files in Drive.

Runs in Pete's Google Apps Script account on meeting weekdays, independently of his computer.
There is no MusicNerdWeb app route, database change, AI summarizer, or hosting dependency.
Uses read-only Google Calendar, Drive metadata, and Docs access. A repo-scoped GitHub token
creates transcript branches and PRs targeting `staging`; merges/releases keep their normal
review path. Branches and PRs are public immediately, before merge.

## Schedule

All times use `America/New_York`, following daylight saving time. Apps Script weekly triggers
run approximately within 15 minutes of the requested time.

| Days | First check | Retry if the scan is incomplete or failed |
| --- | --- | --- |
| Monday, Tuesday, Wednesday, Friday | 12:45 PM | 1:45 PM |
| Thursday (R&D only) | 3:30 PM | 6:15 PM |

There are ten weekly trigger firings, with no weekend schedule. The retry handler does not
scan Google or GitHub after a successful same-day scheduled scan with nothing waiting.
Missing transcripts, unavailable generated attachments, busy runs, service failures and a
missed first run all keep the retry eligible. Corrections after a completed first check,
transcripts arriving after the retry, and meetings moved later than the checks are picked
up by a later weekday's first check through the existing 14-day lookback. Manual
`syncTranscripts` remains available for immediate catch-up and does not suppress retries.

The September 11 timing audit used actual Gemini email delivery timestamps, converted to
Eastern time. Seven Stand Up emails from August 31–September 9 averaged 12:10 PM (median
noon; range 11:42 AM–1:12 PM). Five afternoon R&D emails from August 6–September 3 averaged
3:44 PM (median 3 PM; range 2:50 PM–5:42 PM); morning R&D notes were excluded from that
afternoon estimate. The first checks fall after six of seven standup deliveries and three
of five afternoon R&D deliveries; retries fall after all deliveries in those small samples.
These observations inform the schedule but do not guarantee future delivery or Transcript-tab
readiness. Source email metadata stays outside the repository. The existing 15-minute
document stability check still applies; it is not a polling interval.

## Behavior

- Calendar events determine the session and date. The normal meeting times are 11 AM on
  Monday, Tuesday, Wednesday and Friday, and Thursday R&D at 1 PM, using `America/New_York`.
  Rescheduled sessions retain their actual calendar date; later sessions may wait for the
  next scheduled check. Cancelled, future, and all-day events are excluded.
- Searches the previous 14 days on every run, starting no earlier than `START_DATE`. Only
  generated documents matching the meeting title and local date are eligible. Recurring
  event IDs may change when the series is edited; the exact title is the stable filter.
- Waits until the event has ended and the document has been unchanged for 15 minutes. This is
  a readiness heuristic, not a guarantee that Google has finalized every word. Later changes
  inside the 14-day window are picked up automatically. Older corrections require a manual
  run with an adjusted lookback in the code.
- Exports only the Transcript tab, including nested tabs, speaker labels, timestamps and date
  chips. Notes-only Docs remain pending; summaries are never substituted for a transcript.
  Text is preserved inside a Markdown code block. Formatting, images, and source smart-chip
  interactivity are not exported; unsupported content fails instead of silently truncating.
- Stores each source in `docs/rnd/transcripts/YYYY-MM-DD-<kind>-<source-hash>.md`. Multiple
  sessions on one date cannot overwrite each other. Source links retain their Google access
  settings; the copied text is public.
- Updates the existing open PR for source corrections. After merge/closure, a new content
  version gets a new PR. Retries recover after a commit succeeds but PR creation fails.
  Closed, rejected content is not automatically reopened. Uploaded content is read back before
  recording success. Manual edits to an automation-owned transcript file may be replaced on
  the next source correction; keep editorial notes in the existing meetings directory.
- Source IDs and modification times are checkpointed in Script Properties after success;
  checkpoints expire after 30 days. `previewSync` only logs filenames and character counts.
  Tokens, transcript text, and provider response bodies are never logged. A missing transcript
  is counted as waiting; service failures make the execution fail and retry on the next run.
- Stops a run after about four minutes of processing; a single slow service call can exceed
  that budget. At this meeting volume the workload is small. Check Executions after prolonged
  outages: documents outside the rolling 14-day window require a manual catch-up.

## Install

1. Create a standalone project at <https://script.google.com/> under the Google account with
   access to the calendar and meeting documents. Name it **Music Nerd — Meeting Transcript Sync**.
2. Replace `Code.gs` with this directory's `Code.gs`.
3. In Project Settings, show the `appsscript.json` manifest in the editor. Replace it with this
   directory's manifest. This enables the Calendar v3, Drive v3 and Docs v1 advanced services.
   If using a separately managed Google Cloud project, enable those APIs there as well.
4. In Project Settings → Script Properties, set:

   | Property | Value |
   | --- | --- |
   | `START_DATE` | `2026-09-10` for launch-day onward; change deliberately for backfills |
   | `CALENDAR_ID` | `primary`, or the calendar holding these meeting events |
   | `GITHUB_TOKEN` | Fine-grained token limited to `xdjs/MusicNerdWeb`, Contents: read/write and Pull requests: read/write |

   The GitHub account must have repo write access; the organization may need to approve the
   token. Store it only in Script Properties, never in source, chat, or Git. Restrict editor
   access to the script: an editor can access its properties. Rotate the token before expiry.
5. Run `previewSync`. Authorize the displayed Google scopes. Inspect the execution log for
   expected paths and character counts. It does not write GitHub or checkpoint state.
6. Run `syncTranscripts` once. Verify that it creates the expected PR, that its file contains
   the actual full transcript, and that a second run makes no duplicate PR or commit.
7. Run `installTrigger` once. It creates five `scheduledSync` triggers and five
   `retryScheduledSync` triggers, then removes this user's previous sync schedule, including
   the legacy 15-minute `syncTranscripts` trigger. A failed creation removes partial new
   triggers and leaves the previous schedule intact. Unrelated handlers are preserved.
   Verify the ten weekly triggers under Triggers and the installation summary in Executions.
   No web-app deployment is needed. Watch the next scheduled execution under Executions.

To pause publication, run `stopSync`. This only removes this sync's triggers. Existing source
Docs and published files remain intact. Removing public text in a later commit does not erase
its Git history. Restore automation with `installTrigger` after resolving any access failures.

## Verification

```sh
node --test scripts/meeting-transcript-sync/sync.test.cjs
```

The focused tests exercise exact meeting selection, source attachment filtering, Transcript-tab
extraction, Unicode and Markdown preservation, timezone dates, same-day collisions, dry runs,
failed-write checkpoints, retry recovery, updates, and closed/merged PR behavior. They use
synthetic sources and service doubles. Schedule tests cover exact weekdays/times/timezone,
replacement without duplicates, preservation after partial installation failure, and retry
skipping/recovery through the scheduled entry points. Real Google authorization and a live GitHub write/run
must be verified separately; local tests do not establish that the trigger is installed.

References: [Apps Script time triggers](https://developers.google.com/apps-script/guides/triggers/installable),
[Google Docs tabs](https://developers.google.com/workspace/docs/api/how-tos/tabs),
[Calendar attachments](https://developers.google.com/workspace/calendar/api/v3/reference/events),
[GitHub file writes](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents).

# Google Meet → Music Nerd transcript sync

Publishes the full **Transcript** tab from Google-generated Docs attached to Calendar events
named exactly **Music Nerd Stand Up** or **Music Nerd R&D**. Pete explicitly authorized public
verbatim transcripts for these two meetings on September 10, 2026. This exception does not
include artist interviews, design sessions, unrelated attachments, or all files in Drive.

Runs in Pete's Google Apps Script account every 15 minutes, independently of his computer.
There is no MusicNerdWeb app route, database change, AI summarizer, or hosting dependency.
Uses read-only Google Calendar, Drive metadata, and Docs access. A repo-scoped GitHub token
creates transcript branches and PRs targeting `staging`; merges/releases keep their normal
review path. Branches and PRs are public immediately, before merge.

## Behavior

- Calendar events determine the session and date. The normal times are weekdays at 11 AM and
  Thursday at 1 PM, using `America/New_York`. Rescheduled events and daylight saving time work
  without changing the trigger. Cancelled, future, and all-day events are excluded.
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
7. Run `installTrigger` once. Verify a single `syncTranscripts` time trigger under Triggers.
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
synthetic sources and service doubles. Real Google authorization and a live GitHub write/run
must be verified separately; local tests do not establish that the trigger is installed.

References: [Apps Script time triggers](https://developers.google.com/apps-script/guides/triggers/installable),
[Google Docs tabs](https://developers.google.com/workspace/docs/api/how-tos/tabs),
[Calendar attachments](https://developers.google.com/workspace/calendar/api/v3/reference/events),
[GitHub file writes](https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents).

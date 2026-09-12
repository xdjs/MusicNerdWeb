/** Google Apps Script V8. Run previewSync, then installTrigger. See README.md. */
const SYNC = Object.freeze({
  repo: 'xdjs/MusicNerdWeb', base: 'staging', zone: 'America/New_York',
  folder: 'docs/rnd/transcripts', lookbackDays: 14, quietMinutes: 15,
  titles: { 'Music Nerd Stand Up': 'standup', 'Music Nerd R&D': 'rnd' },
});

function previewSync() { return runSync_(true); }
function syncTranscripts() { return runSync_(false); }

function installTrigger() {
  config_(false);
  const previous = syncTriggers_(), created = [];
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  try {
    days.forEach(day => {
      const times = day === 'THURSDAY' ? [[15, 30], [18, 15]] : [[12, 45], [13, 45]];
      times.forEach(([hour, minute], index) => {
        created.push(ScriptApp.newTrigger(index === 0 ? 'scheduledSync' : 'retryScheduledSync')
          .timeBased().inTimezone(SYNC.zone).onWeekDay(ScriptApp.WeekDay[day])
          .atHour(hour).nearMinute(minute).everyWeeks(1).create());
      });
    });
  } catch (error) {
    // Leave the previous schedule intact if installation fails partway through.
    created.forEach(t => ScriptApp.deleteTrigger(t));
    throw error;
  }
  previous.forEach(t => ScriptApp.deleteTrigger(t));
  PropertiesService.getScriptProperties().deleteProperty('schedule:lastRun');
  console.log('Installed 10 weekly triggers in America/New_York: Mon/Tue/Wed/Fri 12:45 + 13:45 retry; Thu 15:30 + 18:15 retry. Times approximate +/-15 minutes.');
}

function syncTriggers_() {
  return ScriptApp.getProjectTriggers().filter(t =>
    ['syncTranscripts', 'scheduledSync', 'retryScheduledSync'].includes(t.getHandlerFunction()));
}

function stopSync() { syncTriggers_().forEach(t => ScriptApp.deleteTrigger(t)); }

function scheduledSync() {
  const props = PropertiesService.getScriptProperties();
  const day = Utilities.formatDate(new Date(), SYNC.zone, 'yyyy-MM-dd');
  // Mark pending before starting so a timeout, failed write or busy lock still gets a retry.
  props.setProperty('schedule:lastRun', JSON.stringify({ day, pending: true }));
  const report = syncTranscripts();
  props.setProperty('schedule:lastRun', JSON.stringify({ day,
    pending: Boolean(report.busy || report.waiting || report.errors) }));
  return report;
}

function retryScheduledSync() {
  const day = Utilities.formatDate(new Date(), SYNC.zone, 'yyyy-MM-dd');
  let previous;
  try { previous = JSON.parse(PropertiesService.getScriptProperties().getProperty('schedule:lastRun') || 'null'); }
  catch (_) { /* Missing/corrupt state must not suppress a recovery attempt. */ }
  if (previous && previous.day === day && previous.pending === false) {
    console.log('Retry skipped: the scheduled check completed with no pending transcripts.');
    return { skipped: true };
  }
  return scheduledSync();
}

function config_(preview) {
  const p = PropertiesService.getScriptProperties().getProperties();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.START_DATE || '') ||
      !Number.isFinite(Date.parse(p.START_DATE))) throw new Error('Set START_DATE to YYYY-MM-DD.');
  if (!preview && !p.GITHUB_TOKEN) throw new Error('Set GITHUB_TOKEN in Script Properties.');
  return { startDate: p.START_DATE, calendar: p.CALENDAR_ID || 'primary', token: p.GITHUB_TOKEN };
}

function runSync_(preview) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return { busy: true };
  try {
    const cfg = config_(preview), now = new Date(), started = Date.now();
    const props = PropertiesService.getScriptProperties();
    const report = { preview, eligible: 0, unchanged: 0, waiting: 0, published: 0, errors: 0 };
    const seen = new Set();
    let pageToken;
    do {
      const page = Calendar.Events.list(cfg.calendar, {
        timeMin: new Date(now.getTime() - SYNC.lookbackDays * 86400000).toISOString(),
        timeMax: now.toISOString(), singleEvents: true, showDeleted: false,
        maxResults: 100, ...(pageToken ? { pageToken } : {}),
      });
      for (const event of page.items || []) {
        if (Date.now() - started > 240000) throw new Error('Sync time budget reached; retry next run.');
        const kind = meetingKind_(event, cfg.startDate, now);
        if (!kind) continue;
        const attachments = (event.attachments || []).filter(a =>
          a.mimeType === 'application/vnd.google-apps.document');
        let matchedArtifact = false;
        for (const attachment of attachments) {
          const id = documentId_(attachment);
          if (!id) continue;
          if (seen.has(id)) { matchedArtifact = true; continue; }
          try {
            const meta = Drive.Files.get(id, { fields: 'id,name,mimeType,modifiedTime,trashed' });
            // Only the generated artifact for this exact meeting, never an arbitrary attachment.
            if (!artifactMatches_(meta, event)) continue;
            matchedArtifact = true;
            seen.add(id);
            report.eligible++;
            const stateKey = 'sync:' + id;
            const old = JSON.parse(props.getProperty(stateKey) || 'null');
            if (!preview && old && old.modified === meta.modifiedTime) { report.unchanged++; continue; }
            if (!meta.modifiedTime || now - new Date(meta.modifiedTime) < SYNC.quietMinutes * 60000) {
              report.waiting++; continue;
            }
            const doc = Docs.Documents.get(id, { includeTabsContent: true });
            const transcript = extractTranscript_(doc);
            if (!transcript) { report.waiting++; console.log('Waiting for Transcript tab: ' + id); continue; }
            const item = render_(event, kind, id, transcript);
            if (preview) {
              console.log(JSON.stringify({ path: item.path, characters: transcript.length, source: id }));
              continue;
            }
            const receipt = publish_(cfg, item);
            props.setProperty(stateKey, JSON.stringify({ modified: meta.modifiedTime, checked: now.toISOString(), receipt }));
            report.published++;
          } catch (e) {
            report.errors++;
            // Do not log source text, tokens, or provider response bodies.
            console.error('Sync failed for document ' + id + ': ' + safeError_(e));
          }
        }
        if (!matchedArtifact) report.waiting++;
      }
      pageToken = page.nextPageToken;
    } while (pageToken);
    if (!preview) {
      Object.entries(props.getProperties()).forEach(([key, value]) => {
        if (key.startsWith('sync:') && now - new Date(JSON.parse(value).checked) > 30 * 86400000) {
          props.deleteProperty(key);
        }
      });
    }
    console.log(JSON.stringify(report));
    if (report.errors) throw new Error(report.errors + ' transcript(s) failed; inspect execution status.');
    return report;
  } finally { lock.releaseLock(); }
}

function safeError_(error) {
  // Only our deliberately bounded errors are suitable for logs.
  return error && error.syncMessage ? error.syncMessage : 'Source access, content format, or service error';
}

function fail_(message) {
  const e = new Error(message); e.syncMessage = message; throw e;
}

function meetingKind_(event, startDate, now) {
  if (!Object.prototype.hasOwnProperty.call(SYNC.titles, event.summary) || event.status === 'cancelled' ||
      !event.start || !event.start.dateTime || !event.end || !event.end.dateTime) return null;
  const start = new Date(event.start.dateTime), end = new Date(event.end.dateTime);
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || end > now || start > now) return null;
  if (Utilities.formatDate(start, SYNC.zone, 'yyyy-MM-dd') < startDate) return null;
  return SYNC.titles[event.summary];
}

function documentId_(attachment) {
  const id = attachment.fileId || ((attachment.fileUrl || '').match(/^https:\/\/docs\.google\.com\/document\/d\/([\w-]+)/) || [])[1];
  return /^[\w-]+$/.test(id || '') ? id : null;
}

function artifactMatches_(meta, event) {
  const date = Utilities.formatDate(new Date(event.start.dateTime), SYNC.zone, 'yyyy/MM/dd');
  return !meta.trashed && meta.mimeType === 'application/vnd.google-apps.document' &&
    (meta.name || '').startsWith(event.summary + ' - ' + date + ' ') && / - (Notes by Gemini|Transcript)$/.test(meta.name);
}

function extractTranscript_(doc) {
  const matches = [];
  function walk(tabs) {
    for (const tab of tabs || []) {
      if (((tab.tabProperties || {}).title || '').trim().toLowerCase() === 'transcript') matches.push(tab);
      walk(tab.childTabs);
    }
  }
  walk(doc.tabs);
  if (!matches.length) return null;
  if (matches.length !== 1) fail_('Multiple Transcript tabs; manual source selection required');
  const text = bodyText_(matches[0].documentTab.body.content);
  return text.trim() ? text : null;
}

function bodyText_(content) {
  return (content || []).map(block => {
    if (block.sectionBreak) return '';
    if (block.paragraph) return (block.paragraph.elements || []).map(e => {
      if (e.suggestedInsertionIds || e.suggestedDeletionIds) fail_('Unresolved suggested edits in transcript');
      if (e.textRun) return e.textRun.content || '';
      if (e.dateElement && e.dateElement.dateElementProperties && e.dateElement.dateElementProperties.displayText) return e.dateElement.dateElementProperties.displayText;
      if (e.person && e.person.personProperties && e.person.personProperties.name) return e.person.personProperties.name;
      if (e.richLink && e.richLink.richLinkProperties && e.richLink.richLinkProperties.title) return e.richLink.richLinkProperties.title;
      fail_('Unsupported transcript element; refusing incomplete export');
    }).join('');
    if (block.table) return (block.table.tableRows || []).map(row =>
      (row.tableCells || []).map(cell => bodyText_(cell.content)).join('\t')).join('\n');
    fail_('Unsupported transcript block; refusing incomplete export');
  }).join('');
}

function hash_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8)
    .map(b => ('0' + ((b + 256) % 256).toString(16)).slice(-2)).join('');
}

function render_(event, kind, id, transcript) {
  const day = Utilities.formatDate(new Date(event.start.dateTime), SYNC.zone, 'yyyy-MM-dd');
  const stem = day + '-' + kind + '-' + hash_(id).slice(0, 12);
  const fence = '`'.repeat(Math.max(3, ...((transcript.match(/`+/g) || []).map(s => s.length + 1))));
  const content = '# ' + event.summary + ' — ' + day + '\n\n' +
    'Meeting start: ' + event.start.dateTime + ' (' + SYNC.zone + ').\n\n' +
    'Source: https://docs.google.com/document/d/' + id + '/edit (original requires Google access).\n\n' +
    'Verbatim text from the Google-generated Transcript tab. Transcription errors may be present.\n\n' +
    fence + 'text\n' + transcript + (transcript.endsWith('\n') ? '' : '\n') + fence + '\n';
  if (Utilities.newBlob(content).getBytes().length > 900000) fail_('Transcript exceeds 900 KB export limit');
  return { path: SYNC.folder + '/' + stem + '.md', content, stem, digest: hash_(content),
    title: 'docs: add ' + event.summary + ' transcript for ' + day };
}

function github_(cfg, method, path, body, allowMissing) {
  const response = UrlFetchApp.fetch('https://api.github.com/repos/' + SYNC.repo + path, {
    method, headers: { Authorization: 'Bearer ' + cfg.token, Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28' }, contentType: 'application/json',
    ...(body ? { payload: JSON.stringify(body) } : {}), muteHttpExceptions: true,
    followRedirects: false,
  });
  const status = response.getResponseCode();
  if (allowMissing && status === 404) return null;
  if (status < 200 || status >= 300) fail_('GitHub HTTP ' + status + ' during ' + method);
  return JSON.parse(response.getContentText());
}

function fileText_(file) {
  if (!file) return null;
  if (file.encoding !== 'base64') fail_('Unexpected GitHub file encoding');
  return Utilities.newBlob(Utilities.base64Decode(file.content)).getDataAsString('UTF-8');
}

function publish_(cfg, item) {
  const path = '/contents/' + item.path;
  const existing = github_(cfg, 'get', path + '?ref=' + encodeURIComponent(SYNC.base), null, true);
  if (existing && fileText_(existing) === item.content) return 'already on ' + SYNC.base;
  // A stable content-specific branch recovers safely if a run dies after committing.
  const prefix = 'pete/transcript-' + item.stem + '-';
  let open, page = 1, batch;
  do {
    batch = github_(cfg, 'get', '/pulls?state=open&base=' + encodeURIComponent(SYNC.base) + '&per_page=100&page=' + page++);
    open = batch.find(pr => pr.head && pr.head.repo && pr.head.repo.full_name === SYNC.repo && pr.head.ref.startsWith(prefix));
  } while (!open && batch.length === 100);
  const branch = open ? open.head.ref : prefix + item.digest.slice(0, 16);
  const prs = github_(cfg, 'get', '/pulls?state=all&head=' + encodeURIComponent('xdjs:' + branch) +
    '&base=' + encodeURIComponent(SYNC.base) + '&per_page=100');
  if (!open && prs.length) return prs[0].html_url; // Do not reopen rejected/merged content.
  let ref = github_(cfg, 'get', '/git/ref/heads/' + branch, null, true);
  if (!ref) {
    const base = github_(cfg, 'get', '/git/ref/heads/' + SYNC.base);
    ref = github_(cfg, 'post', '/git/refs', { ref: 'refs/heads/' + branch, sha: base.object.sha });
  }
  const previous = github_(cfg, 'get', path + '?ref=' + encodeURIComponent(branch), null, true);
  if (!previous || fileText_(previous) !== item.content) {
    github_(cfg, 'put', path, { message: item.title, branch,
      content: Utilities.base64Encode(item.content, Utilities.Charset.UTF_8),
      ...(previous ? { sha: previous.sha } : {}) });
  }
  // Read back the actual committed file before recording success or opening the PR.
  const verify = github_(cfg, 'get', path + '?ref=' + encodeURIComponent(branch));
  if (fileText_(verify) !== item.content) fail_('GitHub content verification failed');
  if (open) return open.html_url;
  const pr = github_(cfg, 'post', '/pulls', { title: item.title, head: branch, base: SYNC.base,
    body: 'Publishes the full Google Meet transcript for this meeting under the September 10, 2026 authorization.\n\n' +
      'The Transcript tab text is preserved, including speaker labels and timestamps. No summary or AI rewriting is applied. ' +
      'The uploaded Markdown was read back and verified. Source and meeting time are in the file.\n\n' +
      'This automation does not merge or deploy.' });
  return pr.html_url;
}

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createHash } = require('node:crypto');
const vm = require('node:vm');

const source = readFileSync(__dirname + '/Code.gs', 'utf8');
function runtime(overrides = {}) {
  const context = vm.createContext({ console, ...overrides, Utilities: {
    formatDate(date, zone, format) {
      const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
        timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
      }).formatToParts(date).map(p => [p.type, p.value]));
      return [parts.year, parts.month, parts.day].join(format.includes('/') ? '/' : '-');
    },
    DigestAlgorithm: { SHA_256: 'sha256' }, Charset: { UTF_8: 'utf8' },
    computeDigest: (_, text) => [...createHash('sha256').update(text).digest()],
    newBlob: content => ({ getBytes: () => [...Buffer.from(content)], getDataAsString: () => Buffer.from(content).toString('utf8') }),
    base64Encode: text => Buffer.from(text).toString('base64'),
    base64Decode: text => [...Buffer.from(text, 'base64')],
  } });
  vm.runInContext(source, context);
  return context;
}
const event = (summary = 'Music Nerd Stand Up', date = '2026-09-10') => ({
  summary, start: { dateTime: date + 'T11:00:00-04:00' }, end: { dateTime: date + 'T11:15:00-04:00' },
});
const paragraph = text => ({ paragraph: { elements: [{ textRun: { content: text } }] } });
const tab = (title, content, childTabs = []) => ({ tabProperties: { title }, documentTab: { body: { content } }, childTabs });

test('only authorized exact meeting titles after START_DATE and after the event ends', () => {
  const r = runtime(), now = new Date('2026-09-10T18:00:00Z');
  assert.equal(r.meetingKind_(event(), '2026-09-10', now), 'standup');
  assert.equal(r.meetingKind_(event('Music Nerd R&D'), '2026-09-10', now), 'rnd');
  for (const e of [event('Music Nerd artist interview'), event('Music Nerd R&D extra'),
    event('Music Nerd Stand Up', '2026-09-09'), event('Music Nerd Stand Up', '2026-09-11'),
    { ...event(), status: 'cancelled' }]) assert.equal(r.meetingKind_(e, '2026-09-10', now), null);
  assert.equal(r.meetingKind_(event(), '2026-09-10', new Date('2026-09-10T15:05:00Z')), null);
});

test('renamed or unrelated attachments and prior-day docs cannot be exported', () => {
  const r = runtime(), meta = { mimeType: 'application/vnd.google-apps.document', name: 'Music Nerd Stand Up - 2026/09/10 10:59 EDT - Notes by Gemini' };
  assert.equal(r.artifactMatches_(meta, event()), true);
  assert.equal(r.artifactMatches_({ ...meta, trashed: true }, event()), false);
  assert.equal(r.artifactMatches_({ ...meta, name: 'Private agenda' }, event()), false);
  assert.equal(r.artifactMatches_(meta, event('Music Nerd R&D')), false);
  assert.equal(r.artifactMatches_(meta, event('Music Nerd Stand Up', '2026-09-11')), false);
});

test('only Transcript tab is exported, including nested tabs and date chips', () => {
  const r = runtime();
  const doc = { tabs: [tab('Quick notes', [paragraph('DO NOT EXPORT')], [tab('Transcript', [
    { sectionBreak: {} }, { paragraph: { elements: [{ dateElement: { dateElementProperties: { displayText: 'Sep 10, 2026' } } }] } },
    paragraph('\n00:01:00\nPete: café 🎵\n'),
  ])])] };
  assert.equal(r.extractTranscript_(doc), 'Sep 10, 2026\n00:01:00\nPete: café 🎵\n');
  assert.equal(r.extractTranscript_({ tabs: [tab('Full notes', [paragraph('summary')])] }), null);
  assert.throws(() => r.extractTranscript_({ tabs: [tab('Transcript', []), tab('Transcript', [])] }), /Multiple/);
  assert.throws(() => r.extractTranscript_({ tabs: [tab('Transcript', [{ paragraph: { elements: [{ inlineObjectElement: {} }] } }])] }), /Unsupported/);
});

test('Markdown preserves Unicode, whitespace and embedded fences; source IDs prevent same-day collisions', () => {
  const r = runtime(), text = '00:00:01\nPete: ```hello```\n\n  exact spaces 🎵\n';
  const a = r.render_(event(), 'standup', 'sourceA', text);
  assert.ok(a.content.includes('````text\n' + text + '````\n'));
  assert.notEqual(a.path, r.render_(event(), 'standup', 'sourceB', text).path);
  assert.equal(a.path, r.render_(event(), 'standup', 'sourceA', text + 'edit').path);
  const winter = event('Music Nerd Stand Up', '2026-12-10');
  winter.start.dateTime = '2026-12-10T11:00:00-05:00';
  assert.match(r.render_(winter, 'standup', 'sourceA', text).path, /2026-12-10/);
});

function githubRuntime() {
  const files = new Map(), refs = new Set(['staging']), prs = [], calls = [];
  let failPR = false;
  const r = runtime();
  r.github_ = (_cfg, method, url, body, missing) => {
    calls.push({ method, url });
    const u = new URL(url, 'https://github.test');
    if (u.pathname === '/pulls' && method === 'get') return prs.filter(p =>
      (u.searchParams.get('state') === 'all' || p.state === 'open') &&
      (!u.searchParams.get('head') || u.searchParams.get('head') === 'xdjs:' + p.head.ref));
    if (u.pathname === '/pulls' && method === 'post') {
      if (failPR) { failPR = false; throw new Error('Transient PR failure'); }
      const pr = { html_url: 'https://github.test/pr/' + (prs.length + 1), state: 'open', head: { ref: body.head, repo: { full_name: 'xdjs/MusicNerdWeb' } } };
      prs.push(pr); return pr;
    }
    if (u.pathname.startsWith('/git/ref/heads/')) {
      const branch = u.pathname.slice('/git/ref/heads/'.length);
      if (!refs.has(branch) && missing) return null;
      assert.ok(refs.has(branch)); return { object: { sha: 'base' } };
    }
    if (u.pathname === '/git/refs') { refs.add(body.ref.slice('refs/heads/'.length)); return {}; }
    if (u.pathname.startsWith('/contents/')) {
      const key = (body?.branch || u.searchParams.get('ref')) + ':' + u.pathname;
      if (method === 'get') { if (files.has(key)) return files.get(key); assert.ok(missing); return null; }
      files.set(key, { encoding: 'base64', content: body.content, sha: 'file' }); return {};
    }
    throw new Error('Unexpected request ' + method + ' ' + url);
  };
  return { r, files, refs, prs, calls, failNextPR: () => { failPR = true; } };
}

test('retry after committed file/failed PR is idempotent; edits update the open PR', () => {
  const h = githubRuntime(), item = h.r.render_(event(), 'standup', 'source', 'Original\n');
  h.failNextPR();
  assert.throws(() => h.r.publish_({}, item), /Transient/);
  const receipt = h.r.publish_({}, item);
  assert.equal(h.prs.length, 1);
  assert.equal(h.calls.filter(c => c.method === 'put').length, 1);
  assert.equal(h.r.publish_({}, item), receipt);
  const edited = h.r.render_(event(), 'standup', 'source', 'Corrected\n');
  assert.equal(h.r.publish_({}, edited), receipt);
  assert.equal(h.prs.length, 1);
  assert.equal(h.calls.filter(c => c.method === 'put').length, 2);
  assert.ok([...h.files.values()].some(f => Buffer.from(f.content, 'base64').toString().includes('Corrected')));
});

test('rejected content stays closed, and merged unchanged content needs no writes', () => {
  const h = githubRuntime(), item = h.r.render_(event(), 'standup', 'source', 'Original\n');
  h.r.publish_({}, item); h.prs[0].state = 'closed';
  const before = h.calls.filter(c => c.method !== 'get').length;
  h.r.publish_({}, item);
  assert.equal(h.calls.filter(c => c.method !== 'get').length, before);
  h.files.set('staging:/contents/' + item.path, { encoding: 'base64', content: Buffer.from(item.content).toString('base64') });
  assert.equal(h.r.publish_({}, item), 'already on staging');
  assert.equal(h.calls.filter(c => c.method !== 'get').length, before);
});

test('preview never writes GitHub or checkpoints; normal run checkpoints only verified success', () => {
  class TestDate extends Date {
    constructor(...args) { super(...(args.length ? args : ['2026-09-10T18:00:00Z'])); }
    static now() { return Date.parse('2026-09-10T18:00:00Z'); }
  }
  const values = { START_DATE: '2026-09-10', GITHUB_TOKEN: 'test-token' };
  const now = new TestDate(), date = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(now);
  values.START_DATE = date;
  const e = { summary: 'Music Nerd Stand Up', start: { dateTime: new Date(+now - 7200000).toISOString() },
    end: { dateTime: new Date(+now - 3600000).toISOString() }, attachments: [{ fileId: 'doc', mimeType: 'application/vnd.google-apps.document' }] };
  const r = runtime({
    Date: TestDate,
    PropertiesService: { getScriptProperties: () => ({ getProperties: () => ({ ...values }), getProperty: k => values[k],
      setProperty: (k, v) => { values[k] = v; }, deleteProperty: k => { delete values[k]; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    Calendar: { Events: { list: () => ({ items: [e] }) } },
    Drive: { Files: { get: () => ({ name: 'Music Nerd Stand Up - ' + date.replaceAll('-', '/') + ' 10:59 EDT - Notes by Gemini',
      mimeType: 'application/vnd.google-apps.document', modifiedTime: new Date(+now - 1800000).toISOString() }) } },
    Docs: { Documents: { get: () => ({ tabs: [tab('Transcript', [paragraph('Actual text\n')])] }) } },
  });
  let writes = 0;
  r.publish_ = () => { writes++; throw new Error('no write'); };
  r.previewSync(); assert.equal(writes, 0); assert.equal(values['sync:doc'], undefined);
  assert.throws(() => r.syncTranscripts(), /failed/); assert.equal(values['sync:doc'], undefined);
  r.publish_ = () => { writes++; return 'verified'; };
  r.syncTranscripts(); assert.equal(JSON.parse(values['sync:doc']).receipt, 'verified');
  const prior = writes; r.syncTranscripts(); assert.equal(writes, prior);
});

'use client';
import { cleanupThumbnailTestJob } from '@/app/actions/cleanupThumbnailTestJob';
import { useState } from 'react';
import { readThumbnailTestJobs } from '@/lib/source/readThumbnailTestJobs';

/** Temporary owner diagnostic: explicit GET only, no worker controls. */
export default function ThumbnailTestStatus({ artistId }: { artistId: string }) {
  const [jobs, setJobs] = useState<Awaited<ReturnType<typeof readThumbnailTestJobs>> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cleanup, setCleanup] = useState<string | null>(null);
  async function cancelTest() {
    setBusy(true); setError(null);
    try { const result = await cleanupThumbnailTestJob(); setCleanup(`${result.status}: job ${result.jobId}; source ${result.sourceId}`); setJobs(null); }
    catch { setError('Cleanup refused or unavailable. Inspect the queue before retrying; no other action will run.'); }
    finally { setBusy(false); }
  }
  async function read() {
    setBusy(true); setError(null); setJobs(null);
    try { setJobs(await readThumbnailTestJobs(artistId)); }
    catch { setError('Queue inventory unavailable or incomplete. Do not add a test source or advance workers.'); }
    finally { setBusy(false); }
  }
  return <main className="mx-auto max-w-3xl space-y-4 p-6">
    <h1>Temporary thumbnail test: extraction queue</h1>
    <p>Read-only inventory for the configured test artist. This does not start jobs or change sources.</p>
    <button type="button" disabled={busy} onClick={read}>{busy ? 'Reading…' : 'Read extraction queue'}</button>
    <p>Separate cleanup verifies the deleted test source and cancels only its exact pending job. It never runs extraction.</p>
    <button type="button" disabled={busy} onClick={cancelTest}>Cancel deleted test-source job</button>
    {cleanup && <p role="status">{cleanup}</p>}
    {error && <p role="alert">{error}</p>}
    {jobs && <section aria-label="Extraction inventory">
      <p role="status">Complete inventory: {jobs.length} extraction jobs. Active: {jobs.filter(j => ['queued','pending','running'].includes(j.status)).length}.</p>
      <ul>{jobs.map(j => <li key={j.jobId}>{j.jobId} — {j.status} — {j.cursor}/{j.total ?? 'unknown'}</li>)}</ul>
    </section>}
  </main>;
}

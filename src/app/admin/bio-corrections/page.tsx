import { asc, eq } from 'drizzle-orm';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/server/db/drizzle';
import { artistBioCorrections, artists } from '@/server/db/schema';
import BioCorrectionReview from './BioCorrectionReview';

export const dynamic = 'force-dynamic';
export default async function BioCorrectionsPage() {
  const auth = await requireAdmin();
  if (!auth.authenticated) redirect('/');
  const reports = await db.select({ report: artistBioCorrections, artistName: artists.name }).from(artistBioCorrections).innerJoin(artists, eq(artists.id, artistBioCorrections.artistId)).where(eq(artistBioCorrections.status, 'pending')).orderBy(asc(artistBioCorrections.createdAt)).limit(100);
  return <main className="mx-auto max-w-4xl space-y-6 px-5 py-10 text-foreground">
    <Link href="/admin" className="underline">Admin dashboard</Link>
    <h1 className="text-2xl font-semibold">About corrections</h1>
    <p>Review suggestions, then use the artist editor if a change is needed. Resolving a report does not edit the bio. Showing the oldest 100 pending reports.</p>
    {reports.length === 0 && <p>No pending suggestions.</p>}
    {reports.map(({ report, artistName }) => <article key={report.id} className="space-y-3 rounded-xl border p-5">
      <h2 className="text-lg font-semibold"><Link className="underline" href={`/artist/${report.artistId}`}>{artistName}</Link></h2>
      <p>{report.reason.replace('_', ' ')} · {new Date(report.createdAt).toLocaleDateString('en-US')}</p>
      <blockquote className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3">{report.bioSnapshot}</blockquote>
      {report.details && <p className="whitespace-pre-wrap">{report.details}</p>}
      {report.sourceUrl && <a href={report.sourceUrl} target="_blank" rel="noopener noreferrer" className="block break-all underline">Suggested source: {report.sourceUrl}</a>}
      <BioCorrectionReview id={report.id}/>
    </article>)}
  </main>;
}

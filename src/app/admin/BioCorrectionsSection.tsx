import Link from 'next/link';
import type { getPendingBioCorrections } from '@/server/utils/bio/getPendingBioCorrections';
import BioCorrectionReview from './bio-corrections/BioCorrectionReview';

export default function BioCorrectionsSection({data}: {data: Awaited<ReturnType<typeof getPendingBioCorrections>>}) {
 const {reports,total}=data;
 return <div className="space-y-5">
    <p className="text-sm text-muted-foreground">Showing {reports.length} of {total} pending suggestions. Use the artist editor if a change is needed; resolving a report does not edit the bio.</p>
    {reports.length === 0 && <p>No pending suggestions.</p>}
    {reports.map(({ report, artistName }) => <article key={report.id} className="space-y-3 rounded-xl border p-5">
      <h2 className="text-lg font-semibold"><Link className="underline" href={`/artist/${report.artistId}`}>{artistName}</Link></h2>
      <p>{report.reason.replace('_', ' ')} · {new Date(report.createdAt).toLocaleDateString('en-US')}</p>
      <blockquote className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3">{report.bioSnapshot}</blockquote>
      {report.details && <p className="whitespace-pre-wrap">{report.details}</p>}
      {report.sourceUrl && <a href={report.sourceUrl} target="_blank" rel="noopener noreferrer" className="block break-all underline">Suggested source: {report.sourceUrl}</a>}
      <BioCorrectionReview id={report.id}/>
    </article>)}
 </div>;
}

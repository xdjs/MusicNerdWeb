import { notFound } from 'next/navigation';
import ResearchPreview from './ResearchPreview';

export default function ResearchPreviewPage() {
    if (process.env.NODE_ENV !== 'development' && process.env.VERCEL_ENV !== 'preview') notFound();
    return <ResearchPreview />;
}

import { notFound } from 'next/navigation';
import LatestPreview from './LatestPreview';

export default function LatestPreviewPage() {
    if (process.env.NODE_ENV !== 'development' && process.env.VERCEL_ENV !== 'preview') notFound();
    return <LatestPreview />;
}

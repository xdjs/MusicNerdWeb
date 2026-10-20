import { notFound } from 'next/navigation';
import WebsiteLinksPreview from './WebsiteLinksPreview';

export default function WebsiteLinksPreviewPage() {
    if (process.env.NODE_ENV !== 'development' && process.env.VERCEL_ENV !== 'preview') notFound();
    return <WebsiteLinksPreview />;
}

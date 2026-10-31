import { notFound } from 'next/navigation';
import EvidenceChatPreview from './EvidenceChatPreview';

export default function EvidenceChatPreviewPage() {
    if (process.env.NODE_ENV !== 'development' && process.env.VERCEL_ENV !== 'preview') notFound();
    return <EvidenceChatPreview />;
}

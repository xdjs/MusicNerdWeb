import { notFound } from 'next/navigation';
import IntentExplorer from './IntentExplorer';
export default function IntentPreviewPage() {
 if (process.env.NODE_ENV !== 'development' && process.env.VERCEL_ENV !== 'preview') notFound();
 return <IntentExplorer />;
}

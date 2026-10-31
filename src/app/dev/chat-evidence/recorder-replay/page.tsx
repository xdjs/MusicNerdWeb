import {notFound} from 'next/navigation';
import EvidenceChatPreview from '../EvidenceChatPreview';
export default function RecorderReplayPage() {
    if (process.env.NODE_ENV !== 'development') notFound();
    return <EvidenceChatPreview recorderFixture />;
}

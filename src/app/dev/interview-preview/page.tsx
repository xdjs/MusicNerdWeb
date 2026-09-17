import { isInterviewPreviewEnabled } from '@/lib/interview/isInterviewPreviewEnabled';
import { notFound, redirect } from 'next/navigation';

export default function InterviewPreviewPage() {
    if (!isInterviewPreviewEnabled()) notFound();
    redirect('/artist/50f23458-df64-4381-8042-7333e8b64531?interviewPreview=1');
}

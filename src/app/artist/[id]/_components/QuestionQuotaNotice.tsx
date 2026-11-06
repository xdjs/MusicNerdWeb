import type { QuestionQuota } from '@/lib/questionResearch/getQuestionQuota';

const MESSAGES: Record<QuestionQuota['code'], string> = {
    visitor_question_quota: "You've reached your question limit for this hour.",
    question_planning_quota: 'Music Nerd has reached its daily chat allowance.',
    saved_evidence_quota: 'Music Nerd has reached its daily saved-source answer limit.',
    research_quota: 'Music Nerd has reached its outside research limit. You can still ask about saved sources.',
};

export default function QuestionQuotaNotice({ quota, now, disabled, onRetry }: {
    quota: QuestionQuota;
    now: number;
    disabled: boolean;
    onRetry: () => void;
}) {
    const resetAt = quota.resetAt ? new Date(quota.resetAt) : null;
    const remaining = resetAt ? Math.max(0, Math.ceil((resetAt.getTime() - now) / 1000)) : null;
    const minutes = remaining === null ? 0 : Math.ceil(remaining / 60);
    const duration = remaining === null ? '' : remaining >= 3600
        ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
        : remaining >= 60 ? `${Math.floor(remaining / 60)}m ${remaining % 60}s` : `${remaining}s`;
    return <div className="space-y-2 rounded-xl border border-pastypink/20 bg-pastypink/5 p-3 text-sm leading-relaxed text-white/85">
        <p>{MESSAGES[quota.code]}</p>
        {/* The surrounding log announces the notice once. A per-second live
            region would repeatedly interrupt the visitor or screen reader. */}
        <div aria-live="off" className="text-xs text-white/65">
            {remaining === null ? <p>Please try again later.</p> : remaining > 0 ? <>
                <p>Available in {duration}.</p>
                <p>Resets at <time dateTime={quota.resetAt}>{resetAt!.toLocaleString(undefined, {
                    ...(resetAt!.toDateString() !== new Date(now).toDateString() ? { month: 'short', day: 'numeric' } : {}),
                    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
                })}</time>.</p>
            </> : <p>You can try again now.</p>}
        </div>
        {remaining === 0 && <button type="button" disabled={disabled} onClick={onRetry}
            className="min-h-11 text-sm text-pastypink underline underline-offset-4 disabled:opacity-40">Try again</button>}
    </div>;
}

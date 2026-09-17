import type { getInterviewInvite, markInterviewOffered, answerInterviewQuestion, finishInterview } from '@/app/actions/interviewActions';

/** Injectable only for local review; production uses the existing server actions. */
export type InterviewTransport = {
    invite: typeof getInterviewInvite;
    offered: typeof markInterviewOffered;
    answer: typeof answerInterviewQuestion;
    finish: typeof finishInterview;
};

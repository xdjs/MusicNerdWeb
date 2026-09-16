export interface ProfileInterviewCandidate {
    signalId: string;
    key: string;
    kind: 'recent' | 'lore';
    authoredBy: string;
    material: string;
    sourceUrls: string[];
}

/** A bounded first-visit window; return visits use the later offer watermark. */
export const INTERVIEW_RECENT_DAYS = 90;

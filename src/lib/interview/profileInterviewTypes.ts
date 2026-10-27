export interface ProfileInterviewCandidate {
    signalId: string;
    key: string;
    kind: 'recent' | 'lore';
    authoredBy: string;
    material: string;
    sourceUrls: string[];
}

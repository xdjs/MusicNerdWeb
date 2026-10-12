/** Only public neutral descriptors and already verified public answers. */
export type QuestionReuseCandidate = {
  id: string;
  jobId: string;
  questionHash: string;
  intent: string;
  routing: Record<string, string | string[] | null>;
  answer: string;
  passages: { text: string; url: string; evidenceKind: string }[];
};

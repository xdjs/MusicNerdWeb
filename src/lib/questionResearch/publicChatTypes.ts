/** Current-page public visitor turns; never artist interview memory. */
export type PublicChatTurn = {
  question: string;
  answer: string;
  sourceUrls?: string[];
  /** Actual citation number to public URL; never reconstructed from URL order. */
  sourceRefs?: { n: number; url: string }[];
};

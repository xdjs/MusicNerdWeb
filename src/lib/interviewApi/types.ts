export type MemoryField = {
  name: string;
  text: string | null;
  start: number;
  end: number;
  totalChars: number;
  complete: boolean;
};
export type MemoryEntry = {
  entryId: string;
  revision: string;
  kind: "latest_answer" | "correction" | "boundary";
  metadata: Record<string, string | number | null>;
  fields: MemoryField[];
};
export type MemorySnapshot = {
  artistId: string;
  sitting: number;
  entries: MemoryEntry[];
};
export type BoundaryRow = {
  id: string;
  artist_id: string;
  request_id: string;
  wording: string;
  scope: "sitting" | "until_retracted";
  sitting: number;
  origin_answer_id: string | null;
  origin_question_key: string;
  origin_question: string;
  created_at: string | Date;
  retracted_at: string | Date | null;
};
export type BoundaryInput = {
  requestId: string;
  questionKey: string;
  wording: string;
  scope: "sitting" | "until_retracted";
};
export type MemoryPage = {
  status: "ok";
  snapshotId: string;
  sitting: number;
  latestAnswer: { entryId: string; revision: string } | null;
  totalEntries: number;
  entries: MemoryEntry[];
  constraintsComplete: boolean;
  budget: { returnedChars: number; nextCursor: string | null };
};

/** Trusted host scope; never constructed from model arguments. */
export type KnowledgeToolConfig = {
  apiOrigin: string;
  artistId: string;
  getAccessToken: (signal?: AbortSignal) => Promise<string | null>;
  timeoutMs?: number;
};
export type SourceKind = "vault" | "social_caption" | "reel_transcript";
export type KnowledgeSource = {
  sourceId: string;
  kind: SourceKind;
  title: string | null;
  titleTruncated: boolean;
  description: string | null;
  descriptionTruncated: boolean;
  url: string | null;
  revision: string;
  publishedAt: string | null;
  ingestedAt: string | null;
  uploadedAt: string | null;
  eventDate: null;
  originalSourceUrl: null;
  provenance: {
    origin:
      "vault_link" | "vault_upload" | "social_caption" | "provider_transcript";
    provider: string | null;
    method: string | null;
    speaker: "not_applicable" | "unverified" | "verified";
    publisher: string | null;
    speakerName: null;
    relationship: "unknown";
  };
  extraction: {
    readiness: "ready" | "unknown";
    storedChars: number;
    truncated: boolean | null;
    limitations: string[];
  };
};
export type Evidence = { metadata: KnowledgeSource; text: string };
export type Coverage = {
  eligibleSources: number;
  readableSources: number;
  searchedSources: number;
  complete: boolean;
  limitations: string[];
};
export type HistoryField = {
  field: "question" | "answer" | "claim" | "correction";
  text: string | null;
  start: number;
  end: number;
  totalChars: number;
  complete: boolean;
};
export type HistoryEntry = {
  entryId: string;
  revision: string;
  kind: "answer" | "correction";
  questionKey: string | null;
  answerState: "answered" | "skipped" | "offered" | null;
  sitting: number | null;
  offeredAt: string | null;
  answerUpdatedAt: string | null;
  source: string | null;
  correctionKind: string | null;
  fields: HistoryField[];
};
export type KnowledgeJob = {
  extractionOutcomes?: unknown[];
  jobId: string;
  kind:
    | "social_ingest"
    | "caption_extract"
    | "lore_refresh"
    | "source_search"
    | "latest_refresh"
    | "source_extract";
  status: "pending" | "running" | "done" | "failed";
  cursor: number;
  total: number | null;
  updatedAt: string | null;
  errorCategory: string | null;
};
export type KnowledgeSnapshot = {
  artist: { id: string; name: string | null; bio: string | null };
  summary: string | null;
  sources: Evidence[];
  history: HistoryEntry[];
  latestAnswer: { entryId: string; revision: string } | null;
  jobs: KnowledgeJob[];
  coverage: Coverage;
};
export type Passage = {
  source: KnowledgeSource;
  revision: string;
  text: string;
  start: number;
  end: number;
  page: null;
  startSeconds: null;
  endSeconds: null;
};
export type Budget = {
  returnedChars: number;
  truncated: boolean;
  nextCursor: string | null;
};
export type SourceReadVersion = {
  state: "current" | "historical";
  currentRevision: string;
  capturedAt: string | null;
};
export const MAX_RETAINED_SOURCE_VERSIONS = 512;
export type KnowledgeResults = {
  brief: {
    status: "ok";
    artistId: string;
    name: string | null;
    bio: string | null;
    generatedLoreSummary: string | null;
    summaryIsEvidence: false;
    coverage: Coverage;
    historyRequired: true;
    returnedChars: number;
    truncated: boolean;
  };
  sources: {
    status: "ok";
    sources: KnowledgeSource[];
    coverage: Coverage;
    budget: Budget;
  };
  search: {
    status: "ok";
    passages: Passage[];
    coverage: Coverage;
    returnedChars: number;
    truncated: boolean;
  };
  read: {
    version?: SourceReadVersion;
    status: "ok";
    passage: Passage;
    totalChars: number;
    nextStart: number | null;
    returnedChars: number;
    truncated: boolean;
  };
  history: {
    status: "ok";
    entries: HistoryEntry[];
    budget: Budget;
    constraintsComplete: false;
    memory: {
      boundaryState: "not_implemented";
      latestAnswer: KnowledgeSnapshot["latestAnswer"];
    };
    correctionsComplete: boolean;
  };
  "research-status": {
    status: "ok";
    jobs: KnowledgeJob[];
    coverage: Coverage;
    budget: Budget;
  };
};

export const MAX_KNOWLEDGE_BYTES = 128 * 1024;

export type IntentView = 'timeline' | 'listen' | 'world';
export type IntentFilter = 'all' | 'releases' | 'community' | 'films' | 'process';
export type IntentPlan = { view: IntentView; filter: IntentFilter };
export type Evidence = { id: string; title: string; url: string; summary: string; limitation: string; origin: string };
export type ExplorationItem = { id: string; title: string; subtitle: string; description: string; date: string; dateLabel: string; kind: 'release' | 'community' | 'film' | 'process'; evidenceId: string; image?: string; url: string };

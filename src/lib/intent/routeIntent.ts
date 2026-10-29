import type { IntentPlan } from './types';
/** Explicit prototype router; does not invoke or impersonate a model. */
export function routeIntent(input: string, previous?: IntentPlan): IntentPlan | null {
 const text = input.trim().toLowerCase();
 if (!text) return null;
 if (/\b(nft|blockchain|community|zora)\b/.test(text)) return {view:'timeline',filter:'community'};
 if (/\b(video|videos|visual|film|films|world|artwork)\b/.test(text)) return {view:'world',filter:'all'};
 if (/\b(process|behind|making)\b/.test(text)) return {view:'world',filter:'process'};
 if (/\b(career|timeline|history|chronolog|journey)\b/.test(text)) return {view:'timeline',filter:'all'};
 if (/\b(listen|listening|start|songs|music|album|albums)\b/.test(text)) return {view:'listen',filter:'all'};
 if (/^(only |just )?releases[.!?]?$/.test(text) && previous?.view === 'timeline') return {...previous,filter:'releases'};
 if (/^(all|show all|everything)[.!?]?$/.test(text) && previous) return {...previous,filter:'all'};
 return null;
}

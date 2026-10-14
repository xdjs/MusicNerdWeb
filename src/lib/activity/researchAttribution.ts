import { triggerLabels } from './activityLabels';

/** Describe the recorded role without implying an automatic job was a manual request. */
export function researchAttribution(actor: string, trigger: string | null) {
  return {
    actorLabel: trigger === 'claim_approval' ? `Claim approved by ${actor}`
      : trigger === 'editor_search' ? `Research requested by ${actor}`
      : !trigger || trigger === 'unrecorded' ? `Recorded account: ${actor}`
      : `Research initiated by ${actor}`,
    reasonLabel: trigger ? `Research reason: ${triggerLabels[trigger] ?? trigger}` : 'Research reason not recorded',
  };
}

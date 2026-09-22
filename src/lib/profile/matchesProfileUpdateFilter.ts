import { PROFILE_UPDATE_KINDS } from './profileUpdateFilters';

export function matchesProfileUpdateFilter(kind: string, filter: string): boolean {
  return filter === 'All' || (Object.hasOwn(PROFILE_UPDATE_KINDS, filter) && PROFILE_UPDATE_KINDS[filter]!.includes(kind));
}

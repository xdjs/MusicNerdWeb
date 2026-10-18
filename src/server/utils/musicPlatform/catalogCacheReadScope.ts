import { AsyncLocalStorage } from 'node:async_hooks';

// Inherits into Next's stale-cache revalidation without affecting other requests.
export const catalogCacheReadScope = new AsyncLocalStorage<boolean>();

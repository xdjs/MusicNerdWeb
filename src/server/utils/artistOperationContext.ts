import { AsyncLocalStorage } from 'node:async_hooks';

export type ArtistOperationOwnership = { expectedClaimId: string | null; userId?: string };
const operations = new AsyncLocalStorage<ArtistOperationOwnership & { artistId: string }>();
export const getActiveArtistOperation = () => operations.getStore();

/** Carries authorization across async discovery, never a database transaction. */
export function withArtistOperation<T>(artistId: string, ownership: ArtistOperationOwnership, operation: () => T): T {
    return operations.run({ ...ownership, artistId }, operation);
}

export function getArtistOperationOwnership(artistId: string): ArtistOperationOwnership | undefined {
    const context = operations.getStore();
    if (context && context.artistId !== artistId) throw new Error('Artist operation scope mismatch');
    return context;
}

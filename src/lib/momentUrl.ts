/** Chain id → the short name In Process uses in `/collect/<chain>:<address>/<tokenId>`. */
const CHAIN_SHORT_NAMES: Record<number, string> = {
    8453: 'base',
    84532: 'bsep',
    1: 'eth',
    10: 'op',
    7777777: 'zora',
};

/** The moment's page on inprocess.world, or `fallback` when the chain is unknown. */
export function momentUrl(chainId: number | null | undefined, address: string, tokenId: string, fallback: string): string {
    const chain = chainId ? CHAIN_SHORT_NAMES[chainId] : undefined;
    return chain ? `https://www.inprocess.world/collect/${chain}:${address}/${tokenId}` : fallback;
}

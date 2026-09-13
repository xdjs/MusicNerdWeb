import type { UrlMap } from '@/server/db/DbTypes';

/**
 * Wallet and ENS rows aren't link-paste targets; everything else in the urlmap is.
 * Decided by site name, not by matching the example text: the old `0x` match also
 * hid In Process, whose example URL carries an address. The live urlmap row is
 * `wallet`; artistLinkService accepts `wallets` too, so both are covered.
 */
const NOT_LINK_TARGETS = new Set(['wallet', 'wallets', 'ens']);

export function isLinkTarget(link: Pick<UrlMap, 'siteName'>): boolean {
    return !NOT_LINK_TARGETS.has(link.siteName);
}

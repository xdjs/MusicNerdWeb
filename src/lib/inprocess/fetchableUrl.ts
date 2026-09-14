// Same gateways In Process's own web app resolves through (web/lib/protocolSdk/ipfs/gateway.ts),
// except Arweave: ar-io.net was unreachable from here, and arweave.net redirects to the same bytes.
const ARWEAVE_GATEWAY = 'https://arweave.net';
const IPFS_GATEWAY = 'https://magic.decentralized-content.com';

/** Turn an `ar://`, `ipfs://` or https URI into something an <img> can load. Insecure and unknown schemes return null. */
export function fetchableUrl(uri: string | null | undefined): string | null {
    if (!uri || typeof uri !== 'string') return null;
    const trimmed = uri.trim();
    if (trimmed.startsWith('ar://')) {
        const id = trimmed.slice('ar://'.length);
        return id && id !== 'undefined' ? `${ARWEAVE_GATEWAY}/${id}` : null;
    }
    if (trimmed.startsWith('ipfs://')) {
        const cid = trimmed.slice('ipfs://'.length).replace(/^ipfs\//, '');
        return cid ? `${IPFS_GATEWAY}/ipfs/${cid}` : null;
    }
    if (/^https:\/\//.test(trimmed)) return trimmed;
    return null;
}

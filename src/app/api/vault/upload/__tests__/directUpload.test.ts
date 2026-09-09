/** @jest-environment node */
// @ts-nocheck
import { jest } from '@jest/globals';
if (!('json' in Response)) {
    Response.json = (data, init) => new Response(JSON.stringify(data), {
        headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) }, status: init?.status || 200,
    });
}
jest.mock('@/server/auth', () => ({ getServerAuthSession: jest.fn() }));
jest.mock('@/server/utils/dev-auth', () => ({ getDevSession: jest.fn().mockResolvedValue(null) }));
jest.mock('@/server/utils/artistEditAuth', () => ({ canEditArtist: jest.fn() }));
jest.mock('@/server/lib/supabase', () => ({ getSupabaseAdmin: jest.fn(), VAULT_BUCKET: 'vault-files' }));
jest.mock('@/server/utils/queries/dashboardQueries', () => ({ getVaultSourcesByArtistId: jest.fn(), insertVaultSource: jest.fn() }));
jest.mock('@/server/utils/queries/loreRefresh', () => ({ queueLoreRefresh: jest.fn() }));
jest.mock('@/server/utils/extractPdfText', () => ({ extractPdfText: jest.fn().mockResolvedValue('A short artist-written document.') }));
const artistId = '11111111-1111-4111-8111-111111111111';
const req = body => new Request('https://example.test', { method: 'POST', body: JSON.stringify(body) });

describe('direct private-storage uploads', () => {
    beforeEach(() => { jest.resetModules(); });
    async function setup() {
        const auth = await import('@/server/auth');
        const guard = await import('@/server/utils/artistEditAuth');
        const sb = await import('@/server/lib/supabase');
        const dq = await import('@/server/utils/queries/dashboardQueries');
        const queue = await import('@/server/utils/queries/loreRefresh');
        auth.getServerAuthSession.mockResolvedValue({ user: { id: 'owner' } });
        guard.canEditArtist.mockResolvedValue(true);
        dq.getVaultSourcesByArtistId.mockResolvedValue([]);
        dq.insertVaultSource.mockResolvedValue({ id: 'source' });
        queue.queueLoreRefresh.mockResolvedValue(undefined);
        const bytes = Buffer.from('%PDF-1.4\nfixture');
        const bucket = {
            createSignedUploadUrl: jest.fn().mockResolvedValue({ data: { signedUrl: 'https://storage.example/signed' }, error: null }),
            download: jest.fn().mockResolvedValue({ data: new Blob([bytes]), error: null }),
            upload: jest.fn().mockResolvedValue({ error: null }),
            getPublicUrl: jest.fn(() => ({ data: { publicUrl: 'https://storage.example/pdf' } })),
            remove: jest.fn().mockResolvedValue({ error: null }),
        };
        const from = jest.fn(() => bucket);
        sb.getSupabaseAdmin.mockReturnValue({ storage: { from } });
        const sign = (await import('../sign/route')).POST;
        const complete = (await import('../complete/route')).POST;
        const tickets = await import('@/server/utils/vaultUploadTicket');
        const ticket = tickets.signUploadTicket({ userId: 'owner', artistId, path: artistId+'/fixture.pdf', name: 'fixture.pdf', type: 'application/pdf', size: bytes.length, expires: Date.now()+60000 });
        return { auth, guard, dq, queue, bucket, from, sign, complete, tickets, ticket };
    }
    it('accepts exactly 10 MiB and rejects one byte over before creating an upload', async () => {
        const { sign, bucket } = await setup();
        const body = { artistId, name: 'file.pdf', type: '', size: 10*1024*1024 };
        const response = await sign(req(body));
        expect(response.status).toBe(200);
        expect((await response.json()).contentType).toBe('application/pdf');
        expect((await sign(req({ ...body, size: body.size+1 }))).status).toBe(400);
        expect(bucket.createSignedUploadUrl).toHaveBeenCalledTimes(1);
    });
    it('requires authentication and artist authorization', async () => {
        const { sign, auth, guard, bucket } = await setup();
        const body = { artistId, name: 'file.pdf', type: 'application/pdf', size: 100 };
        auth.getServerAuthSession.mockResolvedValue(null);
        expect((await sign(req(body))).status).toBe(401);
        auth.getServerAuthSession.mockResolvedValue({ user: { id: 'other' } });
        guard.canEditArtist.mockResolvedValue(false);
        expect((await sign(req(body))).status).toBe(403);
        expect(bucket.createSignedUploadUrl).not.toHaveBeenCalled();
    });
    it('rejects forged, expired and different-user completion tickets', async () => {
        const { tickets, ticket, complete, auth, bucket } = await setup();
        expect((await complete(req({ ticket: ticket+'tampered' }))).status).toBe(400);
        auth.getServerAuthSession.mockResolvedValue({ user: { id: 'other' } });
        expect((await complete(req({ ticket }))).status).toBe(400);
        expect(() => tickets.readUploadTicket(tickets.signUploadTicket({ userId:'owner', expires:0 }), 'owner')).toThrow();
        expect(bucket.download).not.toHaveBeenCalled();
    });
    it('extracts PDF text and queues Lore only after validating and saving the source', async () => {
        const { complete, ticket, dq, queue, bucket, from } = await setup();
        expect((await complete(req({ ticket }))).status).toBe(200);
        expect(from).toHaveBeenCalledWith('lore-upload-staging');
        expect(dq.insertVaultSource).toHaveBeenCalledWith(expect.objectContaining({ extractedText:'A short artist-written document.', status:'approved' }));
        expect(queue.queueLoreRefresh).toHaveBeenCalledWith(artistId);
        expect(dq.insertVaultSource.mock.invocationCallOrder[0]).toBeLessThan(queue.queueLoreRefresh.mock.invocationCallOrder[0]);
        expect(bucket.remove).toHaveBeenCalled();
    });
    it('rejects mismatched file bytes before publishing', async () => {
        const { complete, ticket, bucket, dq } = await setup();
        bucket.download.mockResolvedValue({ data: new Blob(['not a pdf payload']), error:null });
        expect((await complete(req({ ticket }))).status).toBe(400);
        expect(bucket.upload).not.toHaveBeenCalled();
        expect(dq.insertVaultSource).not.toHaveBeenCalled();
    });
    it('reauthorizes completion after a claim is revoked', async () => {
        const { complete, ticket, guard, bucket } = await setup();
        guard.canEditArtist.mockResolvedValue(false);
        expect((await complete(req({ ticket }))).status).toBe(403);
        expect(bucket.download).not.toHaveBeenCalled();
    });
});

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
jest.mock('@/server/utils/queries/dashboardQueries', () => ({ getVaultUploadByPath: jest.fn(), insertVaultSource: jest.fn() }));
jest.mock('@/server/utils/queries/loreRefresh', () => ({ queueLoreRefresh: jest.fn() }));
jest.mock('@/server/utils/queries/lorePersistence', () => ({ getLoreClaimGeneration: jest.fn().mockResolvedValue('claim-1') }));
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
        dq.getVaultUploadByPath.mockResolvedValue(undefined);
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
    it('removes the public copy and rejects completion when ownership changes during upload', async () => {
        const { complete, ticket, dq, bucket, from, queue } = await setup();
        const { OwnershipChangedError } = await import('@/server/utils/queries/ownershipWrites');
        dq.insertVaultSource.mockRejectedValue(new OwnershipChangedError());
        const response = await complete(req({ ticket }));
        expect(response.status).toBe(403);
        expect(bucket.upload).toHaveBeenCalled();
        expect(from).toHaveBeenLastCalledWith('vault-files');
        expect(bucket.remove).toHaveBeenCalledWith([artistId + '/fixture.pdf']);
        expect(queue.queueLoreRefresh).not.toHaveBeenCalled();
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
        expect(dq.insertVaultSource).toHaveBeenCalledWith(expect.objectContaining({ extractedText:'A short artist-written document.', status:'approved' }), { userId: 'owner', expectedClaimId: 'claim-1' });
        expect(queue.queueLoreRefresh).toHaveBeenCalledWith(artistId);
        expect(dq.insertVaultSource.mock.invocationCallOrder[0]).toBeLessThan(queue.queueLoreRefresh.mock.invocationCallOrder[0]);
        expect(bucket.remove).toHaveBeenCalled();
    });
    it('returns the saved upload with a retry warning when Lore enqueue fails', async () => {
        const { complete, ticket, queue, bucket, dq } = await setup();
        queue.queueLoreRefresh.mockRejectedValue(new Error('queue unavailable'));
        const response = await complete(req({ ticket }));
        expect(response.status).toBe(200);
        expect(await response.json()).toEqual({ source: { id: 'source' }, warning: expect.stringContaining('File saved') });
        expect(bucket.remove).toHaveBeenCalled();
        dq.getVaultUploadByPath.mockResolvedValue({ id: 'source', filePath: artistId+'/fixture.pdf' });
        expect((await complete(req({ ticket }))).status).toBe(200);
        expect(dq.insertVaultSource).toHaveBeenCalledTimes(1);
    });
    it('does not fail a saved upload when temporary-object cleanup fails', async () => {
        const { complete, ticket, bucket } = await setup();
        bucket.remove.mockRejectedValue(new Error('cleanup unavailable'));
        expect((await complete(req({ ticket }))).status).toBe(200);
    });
    it('removes the public copy after a confirmed pre-save failure', async () => {
        const { complete, ticket, bucket, dq, from } = await setup();
        dq.insertVaultSource.mockRejectedValue(new Error('insert failed'));
        expect((await complete(req({ ticket }))).status).toBe(500);
        expect(from).toHaveBeenLastCalledWith('vault-files');
        expect(bucket.remove).toHaveBeenCalledWith([artistId + '/fixture.pdf']);
    });
    it('recovers a committed source after a lost insert response without deleting its file', async () => {
        const { complete, ticket, bucket, dq } = await setup();
        dq.insertVaultSource.mockRejectedValue(new Error('connection lost after commit'));
        dq.getVaultUploadByPath.mockResolvedValueOnce(undefined).mockResolvedValue({ id: 'committed-source' });
        const response = await complete(req({ ticket }));
        expect(response.status).toBe(200);
        expect((await response.json()).source.id).toBe('committed-source');
        expect(bucket.remove).not.toHaveBeenCalled();
    });
    it('preserves uncertain publication and requests same-ticket retry if reconciliation fails', async () => {
        const { complete, ticket, bucket, dq } = await setup();
        dq.insertVaultSource.mockRejectedValue(new Error('connection lost'));
        dq.getVaultUploadByPath.mockResolvedValueOnce(undefined).mockRejectedValue(new Error('database unavailable'));
        const response = await complete(req({ ticket }));
        expect(response.status).toBe(503);
        expect((await response.json()).retryCompletion).toBe(true);
        expect(bucket.remove).not.toHaveBeenCalled();
    });
    it.each(['text/csv', 'application/json'])('classifies %s uploads as data', async type => {
        const { complete, tickets, bucket, dq } = await setup();
        const bytes = Buffer.from(type === 'application/json' ? '{"release":"demo"}' : 'release,year\ndemo,2025');
        bucket.download.mockResolvedValue({ data: new Blob([bytes]), error: null });
        const ticket = tickets.signUploadTicket({ userId: 'owner', artistId, path: artistId+'/data', name: 'data', type, size: bytes.length, expires: Date.now()+60000 });
        expect((await complete(req({ ticket }))).status).toBe(200);
        expect(dq.insertVaultSource).toHaveBeenCalledWith(expect.objectContaining({ type: 'data', extractedText: bytes.toString('utf8') }), { userId: 'owner', expectedClaimId: 'claim-1' });
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

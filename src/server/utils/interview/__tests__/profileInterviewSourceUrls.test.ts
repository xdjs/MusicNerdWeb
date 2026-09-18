import { profileInterviewSourceUrls } from '../profileInterviewSourceUrls';
import { getVaultSourcesByArtistId } from '@/server/utils/queries/dashboardQueries';
jest.mock('@/server/utils/queries/dashboardQueries', () => ({ getVaultSourcesByArtistId: jest.fn() }));
it('recovers an In Process reference after the item leaves Latest without refetching the timeline', async () => {
    const url = 'https://inprocess.world/moment/old-item';
    const key = `profile_recent_${Buffer.from(url).toString('base64url')}`;
    expect((await profileInterviewSourceUrls('a1', [key])).get(key)).toBe(url);
    expect(getVaultSourcesByArtistId).not.toHaveBeenCalled();
});
it('rejects unsafe encoded references and only returns still-approved public Lore URLs', async () => {
    jest.mocked(getVaultSourcesByArtistId).mockResolvedValue([
        { id: 'approved', status: 'approved', url: 'https://example.com/article' },
        { id: 'removed', status: 'rejected', url: 'https://example.com/rejected' },
        { id: 'file', status: 'approved', url: 'https://storage.example.com/private', filePath: 'private/key' },
    ] as never);
    const bad = `profile_recent_${Buffer.from('javascript:alert(1)').toString('base64url')}`;
    const found = await profileInterviewSourceUrls('a1', [bad, 'profile_lore_approved', 'profile_lore_removed', 'profile_lore_file']);
    expect([...found]).toEqual([['profile_lore_approved', 'https://example.com/article']]);
});

import { getProfileInterviewCandidates } from '../getProfileInterviewCandidates';
import { getArtistById } from '@/server/utils/queries/artistQueries';
import { getArtistLatest } from '@/server/utils/queries/artistLatestQueries';
import { getVaultSourcesByArtistId } from '@/server/utils/queries/dashboardQueries';
jest.mock('@/server/utils/queries/artistQueries', () => ({ getArtistById: jest.fn() }));
jest.mock('@/server/utils/queries/artistLatestQueries', () => ({ getArtistLatest: jest.fn() }));
jest.mock('@/server/utils/queries/dashboardQueries', () => ({ getVaultSourcesByArtistId: jest.fn() }));
const load = jest.mocked(getArtistLatest);
const vault = jest.mocked(getVaultSourcesByArtistId);
beforeEach(() => {
    jest.mocked(getArtistById).mockResolvedValue({ id: 'a1', name: 'Nova' } as never);
    load.mockResolvedValue({ items: [], unavailable: false });
    vault.mockResolvedValue([]);
});
const item = (kind = 'moment', date = '2026-09-15') => ({ id: 'moment:one', kind, title: 'Night textures', text: 'A field recording from the station.', date,
    sourceUrl: 'https://inprocess.world/moment/one', sourceLabel: 'View', imageUrl: null, imageCaption: '' });
it('uses fresh In Process and newly added approved Lore, not previous answers or stale Latest', async () => {
    load.mockResolvedValue({ items: [item(), item('interview'), item('instagram', '2020-01-01')] as never, unavailable: false });
    vault.mockResolvedValue([{ id: 'v1', status: 'approved', title: 'Early years', url: 'https://example.com/article', extractedText: 'The writer describes early work.', createdAt: '2026-09-14', updatedAt: '2026-09-14', publishedAt: '2001-01-01' },
        { id: 'v2', status: 'pending', title: 'Pending', url: 'https://example.com/pending', updatedAt: '2026-09-15' }] as never);
    const result = await getProfileInterviewCandidates('a1', '2026-09-01', new Set(), new Set(), new Date('2026-09-16'));
    expect(result.map(c => c.kind)).toEqual(['recent', 'lore']);
    expect(result[0]?.material).toContain('In Process');
    expect(result[1]?.authoredBy).toBe('source author; not necessarily the artist');
    expect(vault).toHaveBeenCalledWith('a1', 'approved');
});
it('excludes source URLs already offered and exact keys before limiting', async () => {
    load.mockResolvedValue({ items: [item()] as never, unavailable: false });
    expect(await getProfileInterviewCandidates('a1', null, new Set(), new Set([item().sourceUrl]), new Date('2026-09-16'))).toEqual([]);
});
it('can use an uploaded Lore document without exposing its storage path', async () => {
    vault.mockResolvedValue([{ id: 'v1', status: 'approved', title: 'Notes', filePath: 'private/storage/key', url: 'upload://private/storage/key', extractedText: 'My own notes.', createdAt: '2026-09-14', updatedAt: '2026-09-14' }] as never);
    const [candidate] = await getProfileInterviewCandidates('a1', null, new Set(), new Set(), new Date('2026-09-16'));
    expect(candidate?.key).toBe('profile_lore_v1');
    expect(candidate?.sourceUrls).toEqual([]);
    expect(candidate?.material).not.toContain('private/storage/key');
});

it('excludes a previously offered key and ignores future-dated sources', async () => {
    load.mockResolvedValue({ items: [item()] as never, unavailable: false });
    const now = new Date('2026-09-16');
    const [first] = await getProfileInterviewCandidates('a1', null, new Set(), new Set(), now);
    expect(await getProfileInterviewCandidates('a1', null, new Set([first!.key]), new Set(), now)).toEqual([]);
    load.mockResolvedValue({ items: [item('moment', '2027-01-01')] as never, unavailable: false });
    expect(await getProfileInterviewCandidates('a1', null, new Set(), new Set(), now)).toEqual([]);
});

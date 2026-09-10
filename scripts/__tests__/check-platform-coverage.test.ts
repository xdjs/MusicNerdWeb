import { checkPlatformCoverage } from '../check-platform-coverage';
import { PROFILE_LINK_COLUMNS, PLATFORM_DOMAINS } from '@/server/utils/artistPlatforms';

const retired = ['catalog', 'foundation', 'soundxyz'];
const cols = PROFILE_LINK_COLUMNS.map(column_name => ({ column_name }));
const active = PROFILE_LINK_COLUMNS.filter(name => !retired.includes(name))
    .map(site_name => ({ site_name }));

test('retired configuration is optional while legacy columns and domains remain recognized', () => {
    expect(checkPlatformCoverage(active, cols)).toEqual([]);
    for (const name of retired) {
        expect(PROFILE_LINK_COLUMNS).toContain(name);
        expect(PLATFORM_DOMAINS[name]?.length).toBeGreaterThan(0);
    }
});

test('missing active configuration still fails the tripwire', () => {
    expect(checkPlatformCoverage(active.filter(row => row.site_name !== 'inprocess'), cols))
        .toContain('inprocess: classified here but not configured in urlmap');
});

test('unknown configured platforms and missing artist columns still fail', () => {
    expect(checkPlatformCoverage([...active, { site_name: 'newplatform' }], cols))
        .toContain('newplatform: in urlmap but not a column on artists');
    expect(checkPlatformCoverage([...active, { site_name: 'catalog' }], cols.filter(col => col.column_name !== 'catalog')))
        .toContain('catalog: in urlmap but not a column on artists');
});

import { adminContributionsPath } from '../adminContributionsPath';

describe('adminContributionsPath', () => {
  it('shows pending contributions by default and every status for one contributor', () => {
    expect(adminContributionsPath({})).toBe('/api/admin/contributions?status=pending');
    expect(adminContributionsPath({ userId: 'u1' })).toBe('/api/admin/contributions?userId=u1&status=all');
  });
  it('passes the filters through', () => {
    expect(adminContributionsPath({ query: 'q', origin: 'user', type: 'link', status: 'approved', page: '2' }))
      .toBe('/api/admin/contributions?query=q&origin=user&type=link&status=approved&page=2');
  });
});

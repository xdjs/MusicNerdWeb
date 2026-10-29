import { adminActivityPath } from '../adminActivityPath';

describe('adminActivityPath', () => {
  it('maps the activity parameters', () => {
    expect(adminActivityPath({ activityQuery: 'otter', activityAction: 'source_added', activityId: 'e1', activityPage: '2' }))
      .toBe('/api/admin/activity?query=otter&action=source_added&eventId=e1&page=2');
    expect(adminActivityPath({})).toBe('/api/admin/activity');
  });
});

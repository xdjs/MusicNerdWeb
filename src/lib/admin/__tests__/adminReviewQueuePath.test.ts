import { adminReviewQueuePath } from '../adminReviewQueuePath';

describe('adminReviewQueuePath', () => {
  it('reads the review filters from the admin page parameters', () => {
    expect(adminReviewQueuePath({ reviewType: 'sources', reviewQuery: 'bio', reviewPage: '3' }))
      .toBe('/api/admin/review-queue?type=sources&query=bio&page=3');
  });
  it('defaults the type from the section and accepts the older lore parameters', () => {
    expect(adminReviewQueuePath({ section: 'corrections' })).toBe('/api/admin/review-queue?type=corrections');
    expect(adminReviewQueuePath({ section: 'ugc', loreQuery: 'x', lorePage: ['2', '4'] }))
      .toBe('/api/admin/review-queue?type=links&query=x&page=2');
    expect(adminReviewQueuePath({})).toBe('/api/admin/review-queue?type=all');
  });
});

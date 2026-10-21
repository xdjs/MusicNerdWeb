import { readThumbnailTestJobs } from '../readThumbnailTestJobs';
import { callPrivateResearch } from '@/lib/questionResearch/callPrivateResearch';
import { authorizeThumbnailQueueRead } from '@/app/actions/authorizeThumbnailQueueRead';
jest.mock('@/app/actions/authorizeThumbnailQueueRead', () => ({ authorizeThumbnailQueueRead: jest.fn() }));
jest.mock('@/lib/questionResearch/callPrivateResearch', () => ({ callPrivateResearch: jest.fn() }));
const call = jest.mocked(callPrivateResearch);
const job = { jobId: '00000000-0000-4000-8000-000000000001', kind: 'source_extract', status: 'pending', cursor: 0, total: 1 };
beforeEach(() => { call.mockReset(); jest.mocked(authorizeThumbnailQueueRead).mockReset().mockResolvedValue('artist'); });
test('stops before a read when scope expires or the artist differs', async () => {
  jest.mocked(authorizeThumbnailQueueRead).mockResolvedValue(null);
  await expect(readThumbnailTestJobs('artist')).rejects.toThrow('Test scope expired or unauthorized');
  expect(call).not.toHaveBeenCalled();
});
test('rechecks scope between pagination requests', async () => {
  jest.mocked(authorizeThumbnailQueueRead).mockResolvedValueOnce('artist').mockResolvedValueOnce(null);
  call.mockResolvedValue({status:'ok',jobs:[],budget:{nextCursor:'next',truncated:true}});
  await expect(readThumbnailTestJobs('artist')).rejects.toThrow('Test scope expired or unauthorized');
  expect(call).toHaveBeenCalledTimes(1);
});
test('reads every page without a mutation and returns only extraction jobs', async () => {
  call.mockResolvedValueOnce({ status: 'ok', jobs: [{...job,kind:'question_research'}], budget: {nextCursor:'next',truncated:true} })
    .mockResolvedValueOnce({ status:'ok', jobs:[job], budget:{nextCursor:null,truncated:false} });
  expect(await readThumbnailTestJobs('artist')).toEqual([job]);
  expect(call.mock.calls).toEqual([['/api/artist/artist/research/status?limit=50'],['/api/artist/artist/research/status?limit=50&cursor=next']]);
});
test('does not interpret an API failure as an empty queue', async () => {
  call.mockRejectedValue(new Error('Not signed in'));
  await expect(readThumbnailTestJobs('artist')).rejects.toThrow('Not signed in');
});
test('rejects repeated pagination cursors', async () => {
  call.mockResolvedValue({status:'ok',jobs:[],budget:{nextCursor:'same',truncated:true}});
  await expect(readThumbnailTestJobs('artist')).rejects.toThrow('Incomplete queue inventory');
});
test('rejects malformed status data', async () => {
  call.mockResolvedValue({status:'ok',jobs:[{...job,status:'unknown'}],budget:{nextCursor:null,truncated:false}});
  await expect(readThumbnailTestJobs('artist')).rejects.toThrow();
});
test('rejects truncated final results', async () => {
  call.mockResolvedValue({status:'ok',jobs:[],budget:{nextCursor:null,truncated:true}});
  await expect(readThumbnailTestJobs('artist')).rejects.toThrow('Incomplete queue inventory');
});

import { enqueueClaimInterview } from '../enqueueClaimInterview';
import { withScopedArtistWrite } from '../ownershipWrites';
import { recordArtistActivity } from '../../activity/recordArtistActivity';

jest.mock('../ownershipWrites', () => ({ withScopedArtistWrite: jest.fn() }));
jest.mock('../../activity/recordArtistActivity', () => ({ recordArtistActivity: jest.fn() }));

const execute = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(withScopedArtistWrite).mockImplementation(async (_artist, write) => write({ execute } as never));
  jest.mocked(recordArtistActivity).mockResolvedValue('activity');
});

it('queues private preparation with claimant identity and claim approval provenance', async () => {
  execute.mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: 'job' }]);
  expect(await enqueueClaimInterview('artist', 'claim', 'claimant')).toBe(true);
  expect(withScopedArtistWrite).toHaveBeenCalledWith('artist', expect.any(Function));
  expect(recordArtistActivity).toHaveBeenCalledWith('artist', 'interview_prepare', { trigger: 'claim_approval' }, expect.anything());
  expect(execute).toHaveBeenCalledTimes(2);
});

it('does not recreate a job already associated with this claim', async () => {
  execute.mockResolvedValueOnce([{ id: 'existing' }]);
  expect(await enqueueClaimInterview('artist', 'claim', 'claimant')).toBe(true);
  expect(recordArtistActivity).not.toHaveBeenCalled();
  expect(execute).toHaveBeenCalledTimes(1);
});

it('reports a competing job instead of pretending preparation was queued', async () => {
  execute.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
  expect(await enqueueClaimInterview('artist', 'claim', 'claimant')).toBe(false);
});


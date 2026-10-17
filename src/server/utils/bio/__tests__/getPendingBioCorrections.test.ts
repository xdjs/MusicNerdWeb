import { getPendingBioCorrections } from '../getPendingBioCorrections';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/server/db/drizzle';
jest.mock('@/lib/auth-helpers', () => ({requireAdmin: jest.fn()}));
it('does not read reports or counts for a regular member', async () => {
 jest.mocked(requireAdmin).mockResolvedValue({authenticated:false,response:new Response(null,{status:403})});
 await expect(getPendingBioCorrections()).rejects.toThrow('Administrator access required');
 expect(db.select).not.toHaveBeenCalled();
});

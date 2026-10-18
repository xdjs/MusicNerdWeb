/** @jest-environment node */
import { PATCH } from '../route';
import { requireAdmin } from '@/lib/auth-helpers';
import { db } from '@/server/db/drizzle';
jest.mock('@/lib/auth-helpers', () => ({ requireAdmin: jest.fn() }));
Response.json = (data, init) => new Response(JSON.stringify(data), { ...init, headers: { 'Content-Type': 'application/json' } });
const id = '11111111-1111-4111-8111-111111111111';
const returning = jest.fn(); const set = jest.fn(() => ({ where: () => ({ returning }) }));
const send = (status: string) => PATCH(new Request('https://musicnerd.net/api', { method: 'PATCH', body: JSON.stringify({ status }) }), { params: Promise.resolve({ id }) });
beforeEach(() => { jest.clearAllMocks(); jest.mocked(requireAdmin).mockResolvedValue({ authenticated: true, userId: id, session: {} } as never); jest.mocked(db.update).mockReturnValue({ set } as never); returning.mockResolvedValue([{ id }]); });
it.each([401, 403])('rejects unauthorized review with %s', async status => {
 jest.mocked(requireAdmin).mockResolvedValue({ authenticated: false, response: Response.json({}, { status }) });
 expect((await send('resolved')).status).toBe(status); expect(db.update).not.toHaveBeenCalled();
});
it('preserves the report while recording reviewer identity and decision', async () => {
 expect((await send('resolved')).status).toBe(200);
 expect(set).toHaveBeenCalledWith({ status: 'resolved', reviewedAt: expect.any(String), reviewedBy: id });
});
it('rejects changing previously reviewed reports', async () => {
 returning.mockResolvedValue([]); expect((await send('dismissed')).status).toBe(409);
});
it('only accepts explicit review outcomes', async () => { expect((await send('pending')).status).toBe(400); expect(db.update).not.toHaveBeenCalled(); });

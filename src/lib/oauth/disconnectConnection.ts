import { requestUserApi } from '@/lib/user/requestUserApi';
import { readOAuthResponse } from './readOAuthResponse';

/**
 * Disconnect one of the signed-in member's agents; its tokens stop working at once.
 *
 * @param id - The connection's ID, from the list.
 */
export async function disconnectConnection(id: string): Promise<void> {
  await readOAuthResponse(await requestUserApi(`/api/oauth/connections/${encodeURIComponent(id)}`, { method: 'DELETE' }));
}

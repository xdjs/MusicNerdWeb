import { readAdminResponse } from './readAdminResponse';
import { requestAdminApi } from './requestAdminApi';

/**
 * Turn one role on or off for the given users through MusicNerdAPI.
 *
 * @param userIds - The users.
 * @param role - `whitelisted`, `admin` or `hidden`.
 * @param enabled - Whether to grant it.
 * @returns How many users were updated.
 */
export async function setAdminUserRole(userIds: string[], role: 'whitelisted' | 'admin' | 'hidden', enabled: boolean): Promise<number> {
  const response = await requestAdminApi('/api/admin/users', { method: 'PATCH', body: { userIds, role, enabled } });
  const body = await readAdminResponse<{ updated: number }>(response, 'Could not change user roles.');
  return body.updated;
}

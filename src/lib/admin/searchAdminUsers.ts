import { readAdminResponse } from './readAdminResponse';
import { requestAdminApi } from './requestAdminApi';

export type AdminUserMatch = { id: string; username: string | null; wallet: string | null };

/**
 * Users whose wallet or username contains the search, from MusicNerdAPI.
 *
 * @param search - At least 3 characters.
 * @returns The matching users.
 */
export async function searchAdminUsers(search: string): Promise<AdminUserMatch[]> {
  const response = await requestAdminApi(`/api/admin/users?${new URLSearchParams({ search })}`);
  const body = await readAdminResponse<{ users: AdminUserMatch[] }>(response, 'Could not search users.');
  return body.users;
}

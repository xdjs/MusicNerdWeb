import type { AdminUserMatch } from './searchAdminUsers';

/**
 * How an admin user search result is shown.
 *
 * @param user - The match.
 * @returns Its username, else its wallet, else its id.
 */
export function adminUserLabel(user: AdminUserMatch): string {
  return user.username || user.wallet || user.id;
}

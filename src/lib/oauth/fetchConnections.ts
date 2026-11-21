import { requestUserApi } from '@/lib/user/requestUserApi';
import { readOAuthResponse } from './readOAuthResponse';
import type { OAuthConnection } from './types';

/**
 * The signed-in member's connected agents, newest first.
 *
 * @returns The connections.
 */
export async function fetchConnections(): Promise<OAuthConnection[]> {
  const { connections } = await readOAuthResponse<{ connections: OAuthConnection[] }>(await requestUserApi('/api/oauth/connections'));
  return connections;
}

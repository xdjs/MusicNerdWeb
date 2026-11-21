import { requestUserApi } from '@/lib/user/requestUserApi';
import { readOAuthResponse } from './readOAuthResponse';
import type { ConsentRequest } from './types';

/**
 * Check an agent's authorization request and find out which agent is asking.
 *
 * @param query - The authorization request's query string, unchanged.
 * @returns The agent's name and the host the member is sent back to.
 */
export async function fetchConsentRequest(query: string): Promise<ConsentRequest> {
  return readOAuthResponse<ConsentRequest>(await requestUserApi(`/api/oauth/consent?${query}`));
}

import { requestUserApi } from '@/lib/user/requestUserApi';
import { readOAuthResponse } from './readOAuthResponse';
import type { ConsentDecision } from './types';

/**
 * Record the signed-in member's answer to an agent's authorization request.
 *
 * @param query - The authorization request's query string, unchanged.
 * @param decision - Approve or deny.
 * @returns The URL the API says to send the browser to.
 */
export async function decideConsent(query: string, decision: ConsentDecision): Promise<string> {
  const response = await requestUserApi('/api/oauth/consent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...Object.fromEntries(new URLSearchParams(query)), decision }),
  });
  const { redirectUrl } = await readOAuthResponse<{ redirectUrl: string }>(response);
  return redirectUrl;
}

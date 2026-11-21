/** A connection request the member is asked to approve (`GET /api/oauth/consent`). */
export type ConsentRequest = { status: 'ok'; agent: string; redirectHost: string };

/** The member's answer to a connection request. */
export type ConsentDecision = 'approve' | 'deny';

/** One of the member's connected agents (`GET /api/oauth/connections`). */
export type OAuthConnection = {
  id: string;
  agent: string;
  scopes: string[];
  connectedAt: string;
  lastUsedAt: string | null;
};

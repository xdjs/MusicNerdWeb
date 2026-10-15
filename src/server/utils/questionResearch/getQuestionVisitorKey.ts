import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import { MUSICNERD_RESEARCH_API_KEY } from '@/env';
import { getServerAuthSession } from '@/server/auth';

/** Private quota identity: verified account, otherwise Vercel's overwritten proxy IP. */
export async function getQuestionVisitorKey(request: Request): Promise<string> {
  if (MUSICNERD_RESEARCH_API_KEY.length < 32) throw new Error('Question allowance unavailable');
  const session = await getServerAuthSession();
  let identity: string;
  if (session?.user?.id) {
    identity = `user:${session.user.id}`;
  } else {
    const ip = process.env.VERCEL === '1' ? request.headers.get('x-real-ip')?.trim() : undefined;
    if (!ip || !isIP(ip)) throw new Error('Question visitor unavailable');
    const normalized = isIP(ip) === 6 ? new URL(`http://[${ip}]`).hostname : ip;
    identity = `ip:${normalized}`;
  }
  return createHmac('sha256', MUSICNERD_RESEARCH_API_KEY)
    .update(`musicnerd:question-allowance:v1:${identity}`).digest('hex');
}

import { NextRequest } from 'next/server';
import { getAllLinks } from '@/server/utils/queries/artistQueries';

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const start = performance.now();
  const allLinks = await getAllLinks();
  // Only include platforms that are not 'ens' or 'wallets'
  const regexes = allLinks
    .filter(link => link.siteName !== 'ens' && link.siteName !== 'wallets')
    .map(link => ({ siteName: link.siteName, regex: link.regex }));
  const response = new Response(JSON.stringify(regexes), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
  const end = performance.now();
  console.debug(`[platformRegexes] GET took ${end - start}ms`);
  return response;
}
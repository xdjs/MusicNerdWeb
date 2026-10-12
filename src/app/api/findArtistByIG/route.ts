import { getLoreClaimGeneration } from '@/server/utils/queries/lorePersistence';
import { getArtistByProperty } from '@/server/utils/queries/artistQueries';
import { artists } from '@/server/db/schema';

async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', {status : 405});
  }

  const {ig} = await req.json();

  if (typeof ig !== 'string') {
    return new Response('Missing or invalid required parameters: instagram handle', {status : 400});
  }

  const artistResp = await getArtistByProperty(artists.instagram, ig);
  if (artistResp.status === 200 && artistResp.data) {
    const claimed = await getLoreClaimGeneration(artistResp.data.id);
    return Response.json({ result: { ...artistResp.data, bio: claimed ? artistResp.data.bio : null } }, { headers: { 'Cache-Control': 'private, no-store' } });
  }
  
  // Process the parameters (e.g., database lookup, validation, etc.)
  return new Response(artistResp.message, {status : artistResp.status});
}

export { handler as POST }
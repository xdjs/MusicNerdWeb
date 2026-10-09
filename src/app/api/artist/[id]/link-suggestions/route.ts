import { requireAuth } from '@/lib/auth-helpers';
import { getArtistLinkSuggestions } from '@/server/utils/artistLinkReview/getArtistLinkSuggestions';
import { reviewArtistLinkSuggestion } from '@/server/utils/artistLinkReview/reviewArtistLinkSuggestion';
import { OwnershipChangedError } from '@/server/utils/queries/ownershipWrites';
import { ArtistLinkConflictError } from '@/server/utils/artistLinks/ArtistLinkConflictError';
import { z } from 'zod';
export const dynamic='force-dynamic';
const decision=z.object({id:z.string().uuid(),kind:z.enum(['ugc','source']),decision:z.enum(['approve','dismiss','remove','restore'])});
export async function GET(request: Request,{params}:{params:Promise<{id:string}>}) {
  const auth=await requireAuth(); if(!auth.authenticated)return auth.response;
  const {id}=await params; if(!z.string().uuid().safeParse(id).success)return Response.json({error:'Invalid artist ID'},{status:400});
  const offset=Number(new URL(request.url).searchParams.get('offset')??0);
  if(!Number.isSafeInteger(offset)||offset<0||offset>100000)return Response.json({error:'Invalid page offset'},{status:400});
  try { return Response.json(await getArtistLinkSuggestions(id,auth.userId,offset),{headers:{'Cache-Control':'private, no-store'}}); }
  catch(error) {if(error instanceof OwnershipChangedError)return Response.json({error:'Not authorized for this artist'},{status:403});return Response.json({error:'Could not load link suggestions'},{status:500});}
}
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}) {
  const auth=await requireAuth();if(!auth.authenticated)return auth.response;
  const {id}=await params;const input=decision.safeParse(await request.json().catch(()=>null));
  if(!z.string().uuid().safeParse(id).success || !input.success)return Response.json({error:'Invalid review request'},{status:400});
  try {await reviewArtistLinkSuggestion(id,auth.userId,input.data);return Response.json({success:true});}
  catch(error){if(error instanceof OwnershipChangedError)return Response.json({error:'Not authorized for this artist'},{status:403});if(error instanceof ArtistLinkConflictError)return Response.json({error:error.message},{status:409});return Response.json({error:'Could not review this link'},{status:500});}
}

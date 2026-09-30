import { NextResponse } from 'next/server';
import { getArtistById } from './artistQueries';
import { getBioVersionsByArtistId } from './dashboardQueries';
import { getArtistDocStrict } from './onboardingQueries';
import { getLoreClaimGeneration } from './lorePersistence';
import { persistArtistBio } from './bioPersistence';
import { generateAboutFromDoc } from '../artistDoc/generateAboutFromDoc';
import { stripCitationMarkers, type DocSource } from '../artistDocService';
import { BioConflictError } from '@/lib/bio/bioConflict';
import { OwnershipChangedError, type ArtistWriteAuth } from './ownershipWrites';

/** About is a projection of stored Lore. It never discovers or fetches sources. */
export async function generateArtistBio(artistId: string, auth?: ArtistWriteAuth): Promise<NextResponse> {
  try {
    const ownership = auth ?? { expectedClaimId: await getLoreClaimGeneration(artistId) };
    const artist = await getArtistById(artistId);
    if (!artist) return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
    const pinned = (await getBioVersionsByArtistId(artistId)).find(version => version.isPinned);
    if (pinned) return NextResponse.json({ bio: artist.bio, pinned: true, message: 'Bio is pinned. Unpin it before regenerating.' });

    // Strict read: a database failure is an error, not an empty document.
    const doc = await getArtistDocStrict(artistId);
    if (!doc?.content.trim()) {
      return NextResponse.json({
        code: 'LORE_REQUIRED',
        error: 'Build your Lore document before generating About. Your existing About has been kept.',
      }, { status: 409 });
    }
    const draft = await generateAboutFromDoc(artist.name ?? 'Artist', doc.content, (doc.sources ?? []) as DocSource[]);
    // Match onboarding publication: Lore retains citations; the saved About is prose.
    const bio = stripCitationMarkers(draft);
    if (!bio) throw new Error('About generation returned no prose');
    const saved = await persistArtistBio(artistId, bio, {
      generated: true, expectedBio: artist.bio, ownership,
    });
    return NextResponse.json({ bio: saved });
  } catch (error) {
    if (error instanceof BioConflictError || error instanceof OwnershipChangedError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }
    console.error('[About] Generation from Lore failed', error);
    return NextResponse.json({ error: 'Could not generate About from Lore. Your existing About has been kept.' }, { status: 500 });
  }
}

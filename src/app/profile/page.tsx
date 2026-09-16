import ArtistBuildPreview from "./ArtistBuildPreview";
import ProfileLoading from "./ProfileLoading";
import ProfileConcept from "./ProfileConcept";
import ClientWrapper from "./ClientWrapper";

export default async function Page({ searchParams }: { searchParams: Promise<{ preview?: string; state?: string; collection?: string }> }) {
    const params = await searchParams;
    if (process.env.VERCEL_ENV === 'preview' && params.preview === 'concept') {
        return <ProfileConcept showcase emptyPreview={params.state === 'new'} emptyCollection={params.collection === 'empty'} user={{id: 'design-showcase', email: 'pete@example.com', wallet: null, isAdmin: false, isWhiteListed: false, isHidden: false}} />;
    }
    if (process.env.NODE_ENV === 'development' && params.preview === 'artist-build') return <ArtistBuildPreview />;
    if (process.env.NODE_ENV === 'development' && params.preview === 'loading') return <ProfileLoading />;
    return <ClientWrapper emptyCollection={params.collection === 'empty'} emptyPreview={params.state === 'new'} designPreview={process.env.NODE_ENV === 'development' && params.preview === 'concept'} />;
}

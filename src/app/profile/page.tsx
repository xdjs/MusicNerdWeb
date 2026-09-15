import ProfileLoading from "./ProfileLoading";
import ProfileConcept from "./ProfileConcept";
import ClientWrapper from "./ClientWrapper";

export default async function Page({ searchParams }: { searchParams: Promise<{ preview?: string }> }) {
    const params = await searchParams;
    if (process.env.VERCEL_ENV === 'preview' && params.preview === 'concept') {
        return <ProfileConcept showcase user={{id: 'design-showcase', email: 'pete@example.com', wallet: null, isAdmin: false, isWhiteListed: false, isHidden: false}} />;
    }
    if (process.env.NODE_ENV === 'development' && params.preview === 'loading') return <ProfileLoading />;
    return <ClientWrapper designPreview={process.env.NODE_ENV === 'development' && params.preview === 'concept'} />;
}

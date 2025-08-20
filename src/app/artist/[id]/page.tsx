import { getServerAuthSession } from "@/server/auth";
import { getUserByWallet } from "@/server/utils/queries/userQueries";
import { getArtistById } from "@/server/utils/queries/artistQueries";
import { notFound } from "next/navigation";
import ArtistPage from "./_components/ArtistPage";
import PleaseLoginPage from "@/app/_components/PleaseLoginPage";

export default async function Artist({ params }: { params: { id: string } }) {
  const session = await getServerAuthSession();
  const user = session?.user;

  // Get the artist data
  const artist = await getArtistById(params.id);
  if (!artist) {
    notFound();
  }

  // If user is not authenticated, show login page
  if (!user) {
    return <PleaseLoginPage text="Log in to view artist details" />;
  }

  // Get the user's wallet address
  const walletAddress = user.walletAddress;
  if (!walletAddress) {
    return <PleaseLoginPage text="No wallet address found" />;
  }

  // Get the full user record from the database
  const userRecord = await getUserByWallet(walletAddress);
  if (!userRecord) {
    return <PleaseLoginPage text="User not found" />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <ArtistPage artist={artist} user={userRecord} />
    </div>
  );
}
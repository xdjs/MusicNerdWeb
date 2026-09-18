import ArtistBuildLoader from "@/app/_components/ArtistBuildLoader";

export default function ProfileLoading() {
  return (
    <div className="flex-1 min-h-64 flex items-center justify-center px-5 text-foreground">
      <ArtistBuildLoader size={64} label="Loading profile" />
    </div>
  );
}

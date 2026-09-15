import MusicNerdLoader from "@/app/_components/MusicNerdLoader";

export default function ProfileLoading() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-5 px-5 text-foreground">
      <MusicNerdLoader size={72} label="Loading your MusicNerd" />
      <p className="text-sm text-muted-foreground">Loading your MusicNerd…</p>
    </div>
  );
}

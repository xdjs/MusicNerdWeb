export default function ProfileLoading() {
  return (
    <div role="status" aria-live="polite" className="min-h-[60vh] flex flex-col items-center justify-center gap-5 px-5 text-foreground">
      <img src="/musicNerdLogo.png" alt="" width={72} height={72} className="motion-safe:animate-pulse" />
      <p className="text-sm text-muted-foreground">Loading your MusicNerd…</p>
    </div>
  );
}

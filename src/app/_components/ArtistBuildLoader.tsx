import MusicNerdLoader from "./MusicNerdLoader";

/** The active-stage animation shared with artist profile generation. */
export default function ArtistBuildLoader({ label = "Working on this step", size = 24 }: { label?: string; size?: number }) {
  return (
    <span className="relative flex-shrink-0 flex items-center justify-center" style={{ width: size, height: size }}>
      <span aria-hidden="true" className="absolute inset-0 rounded-full bg-pink-500/25 motion-safe:animate-ping" />
      <MusicNerdLoader size={size} label={label} className="relative" />
    </span>
  );
}

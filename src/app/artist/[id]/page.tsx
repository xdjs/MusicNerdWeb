import { getArtistById } from "@/server/utils/queries/artistQueries";
import { getSpotifyImage, getSpotifyHeaders, getNumberOfSpotifyReleases } from "@/server/utils/queries/externalApiQueries";
import { getArtistDetailsText } from "@/server/utils/services";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  Database,
  ChevronRight,
  Music,
  Globe
} from "lucide-react";

type ArtistProfileProps = {
    params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ArtistProfileProps): Promise<Metadata> {
    const { id } = await params;
    const artist = await getArtistById(id);

    if (!artist) {
        return {
            title: "Artist Not Found | RECXRD",
            description: "The requested artist could not be found.",
        };
    }

    const headers = await getSpotifyHeaders();
    const spotifyImg = await getSpotifyImage(artist.spotify ?? "", undefined, headers);
    const imageUrl = spotifyImg.artistImage || "/default_pfp_pink.png";
    const artistName = artist.name ?? "Unknown Artist";

    return {
        title: `${artistName} | RECXRD`,
        description: `Verified archive for ${artistName}. Discover verified lore, interviews, and history.`,
        openGraph: {
            type: "profile",
            title: `${artistName} | RECXRD`,
            description: `Verified archive for ${artistName}. Discover verified lore, interviews, and history.`,
            images: [
                {
                    url: imageUrl,
                    width: 640,
                    height: 640,
                    alt: `${artistName}`,
                },
            ],
        },
    };
}

// Mock vault sources for prototype
const MOCK_VAULT_SOURCES = [
  {
    id: "v1",
    url: "https://pitchfork.com/features/interview-demo",
    title: "The Making of 'Midnight Sessions': An Exclusive Interview",
    snippet: "Used a vintage Juno-106 synthesizer for the iconic bass line on track 3, recorded in a single take at 3am.",
    type: "interview" as const,
    verifiedAt: "2024-01-15",
  },
  {
    id: "v2",
    url: "https://genius.com/annotations/demo",
    title: "Behind the Lyrics: The Blue Door Metaphor",
    snippet: "The recurring 'blue door' metaphor across their discography references their childhood home in Portland.",
    type: "lore" as const,
    verifiedAt: "2024-01-14",
  },
  {
    id: "v3",
    url: "https://npr.org/music/tiny-desk-demo",
    title: "NPR Tiny Desk: Acoustic Arrangements",
    snippet: "The acoustic arrangement of 'Starlight' was created specifically for this performance, featuring a cello part written the night before.",
    type: "article" as const,
    verifiedAt: "2024-01-08",
  },
];

const TYPE_BADGES: Record<string, string> = {
  interview: "badge-interview",
  review: "badge-review",
  lore: "badge-lore",
  article: "badge-pending",
};

export default async function ArtistProfile({ params }: ArtistProfileProps) {
    const { id } = await params;
    const artist = await getArtistById(id);
    
    if (!artist) {
        return notFound();
    }
    
    const headers = await getSpotifyHeaders();
    const [spotifyImg, numReleases] = await Promise.all([
        getSpotifyImage(artist.spotify ?? "", undefined, headers),
        getNumberOfSpotifyReleases(artist.spotify ?? "", headers),
    ]);

    // Collect social links for display
    const socialLinks = [
        artist.spotify && { name: "Spotify", url: `https://open.spotify.com/artist/${artist.spotify}`, icon: "/siteIcons/spotify_icon.svg" },
        artist.instagram && { name: "Instagram", url: `https://instagram.com/${artist.instagram}`, icon: "/siteIcons/instagram-svgrepo-com.svg" },
        artist.x && { name: "X", url: `https://x.com/${artist.x}`, icon: "/siteIcons/x_icon.svg" },
        artist.youtube && { name: "YouTube", url: artist.youtube, icon: "/siteIcons/youtube_icon.svg" },
        artist.bandcamp && { name: "Bandcamp", url: artist.bandcamp, icon: "/siteIcons/bandcamp_icon.svg" },
        artist.soundcloud && { name: "SoundCloud", url: `https://soundcloud.com/${artist.soundcloud}`, icon: "/siteIcons/soundcloud_icon.svg" },
        artist.tiktok && { name: "TikTok", url: `https://tiktok.com/@${artist.tiktok}`, icon: "/siteIcons/tiktok_icon.svg" },
    ].filter(Boolean) as { name: string; url: string; icon: string }[];

    return (
        <div className="min-h-screen">
            <div className="max-w-6xl mx-auto px-6 py-8">
                {/* Breadcrumb */}
                <div className="flex items-center gap-2 text-sm text-white/40 mb-8">
                    <Link href="/" className="hover:text-white transition-colors">
                        RECXRD
                    </Link>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-white/60">{artist.name}</span>
                </div>

                {/* Artist Header */}
                <div className="glass-card p-8 mb-8">
                    <div className="flex flex-col md:flex-row gap-8">
                        {/* Image */}
                        <div className="flex-shrink-0">
                            <img 
                                src={spotifyImg.artistImage || "/default_pfp_pink.png"} 
                                alt={artist.name ?? "Artist"} 
                                className="w-40 h-40 rounded-2xl object-cover border border-white/10"
                            />
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 space-y-4">
                            <div>
                                <h1 className="text-4xl font-bold text-white mb-2">
                                    {artist.name}
                                </h1>
                                <p className="text-white/40">
                                    {getArtistDetailsText(artist, numReleases)}
                                </p>
                            </div>
                            
                            {/* Bio */}
                            {artist.bio && (
                                <p className="text-white/60 leading-relaxed max-w-2xl">
                                    {artist.bio}
                                </p>
                            )}
                            
                            {/* Social Links */}
                            {socialLinks.length > 0 && (
                                <div className="flex flex-wrap gap-2 pt-2">
                                    {socialLinks.map((link) => (
                                        <a
                                            key={link.name}
                                            href={link.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg
                                                       bg-white/5 border border-white/10
                                                       hover:bg-white/10 hover:border-white/20
                                                       transition-all duration-200"
                                        >
                                            <img 
                                                src={link.icon} 
                                                alt={link.name} 
                                                className="w-4 h-4 opacity-60" 
                                            />
                                            <span className="text-sm text-white/60">{link.name}</span>
                                        </a>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Verified Vault Section */}
                <section className="space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                                <Database className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-semibold text-white">Verified Vault</h2>
                                <p className="text-sm text-white/40">Artist-verified sources and lore</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-white/40">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            <span>{MOCK_VAULT_SOURCES.length} verified sources</span>
                        </div>
                    </div>

                    {/* Vault Grid */}
                    <div className="grid gap-4">
                        {MOCK_VAULT_SOURCES.map((source, index) => (
                            <div 
                                key={source.id}
                                className="glass-card p-5 hover:border-white/15 transition-all duration-200"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex items-start justify-between gap-4 mb-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`badge ${TYPE_BADGES[source.type]}`}>
                                                {source.type}
                                            </span>
                                            <span className="flex items-center gap-1 text-xs text-emerald-400">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Verified
                                            </span>
                                        </div>
                                        <h3 className="font-medium text-white leading-snug">
                                            {source.title}
                                        </h3>
                                    </div>
                                    <a
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-shrink-0 p-2 rounded-lg bg-white/5 
                                                   hover:bg-white/10 transition-colors"
                                    >
                                        <ExternalLink className="w-4 h-4 text-white/40" />
                                    </a>
                                </div>
                                
                                <p className="text-sm text-white/50 leading-relaxed mb-3">
                                    {source.snippet}
                                </p>
                                
                                <div className="flex items-center gap-4 text-xs text-white/30">
                                    <span className="flex items-center gap-1">
                                        <Globe className="w-3 h-3" />
                                        {new URL(source.url).hostname}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {source.verifiedAt}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty State for artists without vault items */}
                    {MOCK_VAULT_SOURCES.length === 0 && (
                        <div className="glass-card p-12 text-center">
                            <Database className="w-12 h-12 text-white/20 mx-auto mb-4" />
                            <h3 className="text-xl font-semibold text-white mb-2">
                                No verified sources yet
                            </h3>
                            <p className="text-white/40 max-w-md mx-auto">
                                This artist hasn&apos;t verified any sources yet. 
                                Check back later for their official archive.
                            </p>
                        </div>
                    )}
                </section>

                {/* MCP/API Section */}
                <section className="mt-12 glass-card p-6">
                    <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <Music className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white mb-1">Machine-Readable API</h3>
                            <p className="text-sm text-white/40 mb-3">
                                Access this artist&apos;s verified vault programmatically via our API. 
                                Perfect for AI assistants, research tools, and integrations.
                            </p>
                            <code className="text-xs bg-white/5 px-3 py-1.5 rounded text-white/60 font-mono">
                                GET /api/mcp/artist/{id}
                            </code>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

"use client";

interface GrapevineIframeProps {
    artistId: string;
    className?: string;
}

export default function GrapevineIframe({ artistId, className }: GrapevineIframeProps) {
    const grapevineUrl = process.env.NEXT_PUBLIC_GRAPEVINE_URL;

    if (!grapevineUrl) {
        return (
            <div className={`w-full h-full flex items-center justify-center bg-gray-50 rounded-md ${className}`}>
                <span className="text-gray-500 text-sm">Grapevine not configured</span>
            </div>
        );
    }

    return (
        <div className="relative w-full h-[180px]">
            <iframe
                src={`${grapevineUrl}/${artistId}`}
                className="w-full h-full border-0 rounded-md pointer-events-none"
                loading="lazy"
                onError={() => console.error('Grapevine iframe failed to load')}
            />
            <a
                href={`${grapevineUrl}/${artistId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors rounded-md"
            >
                <span className="text-gray-600 text-sm">Click to open Grapevine</span>
            </a>
        </div>
    );
}

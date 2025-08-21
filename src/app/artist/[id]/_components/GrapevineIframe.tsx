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

    const handleContainerClick = () => {
        window.open(`${grapevineUrl}/${artistId}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <div 
            className="relative w-full h-[180px] cursor-pointer" 
            onClick={handleContainerClick}
        >
            <iframe
                src={`${grapevineUrl}/${artistId}`}
                className="w-full h-full border-0 rounded-md pointer-events-none"
                loading="lazy"
                onError={() => console.error('Grapevine iframe failed to load')}
            />
        </div>
    );
}

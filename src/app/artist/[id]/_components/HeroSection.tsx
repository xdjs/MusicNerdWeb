interface HeroSectionProps {
    imageUrl: string;
    artistName: string;
}

export default function HeroSection({ imageUrl, artistName }: HeroSectionProps) {
    return (
        <div className="relative w-full h-56 md:h-72 rounded-2xl overflow-hidden">
            {/* Blurred background */}
            <img
                src={imageUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110"
            />
            {/* Dark gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/50" />
            {/* Sharp centered photo with glass ring */}
            <div className="absolute inset-0 flex items-center justify-center">
                <div className="rounded-full p-1 backdrop-blur-md bg-white/20 dark:bg-white/10 border border-white/30 shadow-xl">
                    <img
                        src={imageUrl}
                        alt={artistName}
                        className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover"
                    />
                </div>
            </div>
        </div>
    );
}

"use client"

import ActivityFeed from "./ActivityFeed";

export default function HomePage() {
    return (
        <div className="px-6 sm:px-8 pt-0 pb-4 flex flex-col items-center w-full !flex-grow-0">
            <div className="w-full max-w-2xl">
                {/* Title */}
                <div className="flex justify-center w-full px-4 -mt-2 mb-5">
                    <h1 className="lowercase font-bold"
                        style={{
                            fontSize: 'clamp(32px, calc(32px + (84 - 32) * ((100vw - 360px) / (1440 - 360))), 84px)',
                            letterSpacing: 'clamp(-1px, calc(-1px + (-4 - -1) * ((100vw - 360px) / (1440 - 360))), -4px)',
                            lineHeight: '1',
                            color: '#ff9ce3',
                            textShadow: '0 0 40px rgba(255, 156, 227, 0.25)',
                        }}
                    >
                        music nerd
                    </h1>
                </div>

                <ActivityFeed />
            </div>
        </div>
    );
}

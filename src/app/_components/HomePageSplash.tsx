"use client"

import { Suspense } from "react";
import SearchBar from "./nav/components/SearchBar";
import SlidingText from "./SlidingText";
import TypewriterText from "./TypeWriter";
import Login from "./nav/components/Login";

export default function HomePage({ animation }: { animation: string }) {

    const titles = [
        {
            label: ["Music", "Nerd"],
            color: "#ef95ff",
        },
        {
            label: ["Mindful", "Listener"],
            color: "var(--subtitle-color)",
        },
        {
            label: ["Curious", "Researcher"],
            color: "var(--subtitle-color)",
        },
        {
            label: ["Obsessive", "Collector"],
            color: "var(--subtitle-color)",
        },
        {
            label: ["Enthusiastic", "Curator"],
            color: "var(--subtitle-color)",
        },
        {
            label: ["Executive", "Producer"],
            color: "var(--subtitle-color)",
        },
    ]

    const titleNodes = titles.map((title, index) => (
        <div key={index} style={{ color: title.color }} className="lowercase w-full flex justify-center home-text-h2">
            <h2 className="text-center">
                {title.label[0]} {title.label[1]}
            </h2>
        </div>
    ))

    const slidingNodes = titles.map((title, index) => (
        <div key={index} style={{ color: title.color }} className="lowercase w-full justify-center flex home-text-h2">
            <h2 className="text-center">
                {title.label[0]} {title.label[1]}
            </h2>
        </div>
    ))

    function getTypewriterNodes(titles: { label: string[], color: string }[]) {
        let prevCharCount = 0;
        return titles.map((title, index) => {
            const charCount = title.label[1].length;
            const delay = 80 * (charCount + prevCharCount) + index * 100;
            prevCharCount += charCount;
            return (
                <div key={index} style={{ color: title.color }} className="lowercase w-full flex justify-center home-text-h2">
                    <h2 className="text-center">
                        {title.label[0]} <TypewriterText text={title.label[1]} startDelay={delay} />
                    </h2>
                </div>
            )
        })
    }

    const animations = {
        static: titleNodes,
        slide: <SlidingText items={slidingNodes} interval={800} />,
        typewriter: getTypewriterNodes(titles),
    }

    function getAnimation(animation: string) {
        return animations[animation as keyof typeof animations];
    }

    return (
        <div className="flex flex-col justify-center items-center h-full w-full min-h-screen">
            <div className="absolute top-6 right-6">
                <Login buttonStyles="" />
            </div>

            <div className="flex flex-col items-center justify-center flex-grow w-full max-w-2xl px-4">
                <div className="mb-8">
                    <div className="font-bold text-center"
                        style={{
                            fontSize: 'clamp(28px, calc(28px + (78 - 28) * ((100vw - 360px) / (1440 - 360))), 78px)',
                            letterSpacing: 'clamp(-1px, calc(-1px + (-3 - -1) * ((100vw - 360px) / (1440 - 360))), -3px)',
                            lineHeight: 'clamp(36px, calc(36px + (78 - 36) * ((100vw - 360px) / (1440 - 360))), 78px)'
                        }}
                    >
                        {getAnimation(animation)}
                    </div>
                </div>
                
                <div className="flex flex-col items-center w-full">
                    <div className="text-maroon opacity-30 text-[20px] tracking-[-0.4px] md:text-[35px] md:tracking-[-1.1px] font-bold mb-6 text-center">
                        Ask Music Nerd about an artist
                    </div>
                    <Suspense fallback={<div>Loading...</div>}>
                        <SearchBar isTopSide={true} />
                    </Suspense>
                </div>
            </div>
        </div>
    );
};


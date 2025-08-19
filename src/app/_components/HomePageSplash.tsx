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
            color: "rgb(var(--color-title-pink))",
        },
        {
            label: ["Mindful", "Listener"],
            color: "rgba(var(--color-subtitle), 0.6)",
        },
        {
            label: ["Curious", "Researcher"],
            color: "rgba(var(--color-subtitle), 0.6)",
        },
        {
            label: ["Obsessive", "Collector"],
            color: "rgba(var(--color-subtitle), 0.6)",
        },
        {
            label: ["Enthusiastic", "Curator"],
            color: "rgba(var(--color-subtitle), 0.6)",
        },
        {
            label: ["Executive", "Producer"],
            color: "rgba(var(--color-subtitle), 0.6)",
        },
    ]

    const titleNodes = titles.map((title, index) => (
        <div key={index} style={{ color: title.color }} className="lowercase w-full flex home-text-h2">
            <h2 className="w-1/2 text-right pr-[0.4rem]">
                {title.label[0]}
            </h2>
            <h2 className="w-1/2 pl-[0.4rem]">
                {title.label[1]}
            </h2>
        </div>
    ))

    const slidingNodes = titles.map((title, index) => (
        <div key={index} style={{ color: title.color }} className="lowercase w-full justify-center flex home-text-h2">
            <h2 className="">
                {title.label[0]} {" "} {title.label[1]}
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
                <div key={index} style={{ color: title.color }} className="lowercase w-full flex home-text-h2">
                    <h2 className="w-1/2 text-right pr-[0.4rem]">
                        {title.label[0]}
                    </h2>
                    <h2 className="w-1/2 pl-[0.4rem]">
                        <TypewriterText text={title.label[1]} startDelay={delay} />
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
        <div className="p-6 sm:p-8 flex flex-col justify-center flex-grow h-full w-full">
            <div className="absolute top-6 right-6">
                <Login buttonStyles="" />
            </div>

            <div className="w-full">
                <div className="flex flex-col items-center md:fixed md:left-8 md:top-8 mb-4">
                    <img
                        src="/icon.ico"
                        className="w-auto"
                        style={{
                            width: 'clamp(68px, calc(68px + (94 - 68) * ((100vw - 360px) / (1440 - 360))), 94px)'
                        }}
                        alt="logo"
                    />
                </div>

                <div className="grow mb-8">
                    <div className="font-bold w-full home-text-h2">
                        {getAnimation(animation)}
                    </div>
                </div>
                <div className="flex flex-col items-center w-full px-4">
                    <div className="text-subtitle opacity-30 text-[20px] tracking-[-0.4px] md:text-[35px] md:tracking-[-1.1px] font-bold mb-3">
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


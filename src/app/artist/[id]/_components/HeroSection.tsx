"use client";

import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import StickyHeroBar from "./StickyHeroBar";

interface HeroSectionProps {
    imageUrl: string;
    artistName: string;
}

export default function HeroSection({ imageUrl, artistName }: HeroSectionProps) {
    const heroRef = useRef<HTMLDivElement>(null);

    const { scrollYProgress } = useScroll({
        target: heroRef,
        offset: ["start start", "end start"],
    });

    // Parallax: background moves at half speed
    const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "50%"]);

    // Background fades out as you scroll past
    const bgOpacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

    // Profile photo scales down smoothly
    const photoScale = useTransform(scrollYProgress, [0, 0.8], [1, 0.65]);
    const photoOpacity = useTransform(scrollYProgress, [0.6, 0.9], [1, 0]);

    // Sticky bar fades in smoothly — pure motion value, no React state
    const stickyOpacity = useTransform(scrollYProgress, [0.7, 0.9], [0, 1]);

    return (
        <>
            <StickyHeroBar imageUrl={imageUrl} artistName={artistName} opacity={stickyOpacity} />

            <div ref={heroRef} className="relative w-full h-56 md:h-72 rounded-2xl overflow-hidden">
                {/* Blurred background with parallax + pink tint for depth on dark images */}
                <motion.div
                    className="absolute inset-0"
                    style={{ y: bgY, opacity: bgOpacity }}
                >
                    <img
                        src={imageUrl}
                        alt=""
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover blur-2xl scale-110 brightness-125"
                    />
                    {/* Subtle pink/purple tint so dark images still show parallax depth */}
                    <div className="absolute inset-0 bg-gradient-to-br from-[#ef95ff]/20 via-transparent to-[#7c3aed]/15" />
                </motion.div>
                {/* Dark gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/50" />
                {/* Sharp centered photo with glass ring */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <motion.div
                        className="rounded-full p-1 backdrop-blur-md bg-white/20 dark:bg-white/10 border border-white/30 shadow-xl transition-shadow duration-300 hover:shadow-[0_0_25px_rgba(239,149,255,0.5)]"
                        style={{ scale: photoScale, opacity: photoOpacity }}
                    >
                        <img
                            src={imageUrl}
                            alt={artistName}
                            className="w-32 h-32 md:w-40 md:h-40 rounded-full object-cover"
                        />
                    </motion.div>
                </div>
            </div>
        </>
    );
}

"use client"

import Link from "next/link"
import SearchBar from "./components/SearchBar"
import AddArtist from "./components/AddArtist";
import Login from "./components/Login";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import homeStyles from "@/app/_components/HomePageSplash.module.css";

export default function NavContent() {
    const pathname = usePathname();
    const isProfile = pathname?.startsWith("/artist/");

    if (pathname === "/") {
        return (
            <nav aria-label="Main navigation" className={homeStyles.homeNav}>
                <div className={homeStyles.actions}>
                    <Login buttonStyles="" triggerIcon="account" />
                </div>
            </nav>
        );
    }

    return (
        <nav aria-label="Main navigation" className={`w-full px-3 py-3 nav-bar flex items-center justify-between gap-2 max-w-[1000px] mx-auto ${isProfile ? "sticky top-0 z-40 bg-white/90 backdrop-blur-xl dark:bg-[#1a1a1a]/90 sm:px-6" : "sm:p-6"}`}>
            <div className="flex gap-2 shrink-0">
                <Link href={"/"}>
                    <img
                        src="/icon.ico"
                        width={64}
                        height={64}
                        className={`w-10 h-10 ${isProfile ? "" : "sm:w-16 sm:h-16"}`}
                        alt="logo"
                    />
                </Link>
            </div>

            <div className="flex items-center justify-center gap-2 flex-grow min-w-0">
                <Suspense>
                    <SearchBar />
                </Suspense>
                <AddArtist />
            </div>
            <div className="flex gap-2 items-center shrink-0">
                <Login buttonStyles="" />
            </div>
        </nav>
    )
}

"use client"

import Link from "next/link"
import SearchBar from "./components/SearchBar"
import AddArtist from "./components/AddArtist";
import Login from "./components/Login";
import { ThemeToggle } from "@/app/_components/ThemeToggle";
import { Suspense } from "react";

export default function NavContent() {
    return (
        <nav className="p-6 nav-bar flex items-center justify-between max-w-[1000px] mx-auto">
            <div className="flex gap-2">
                <Link href={"/"}>
                    <img
                        src="/icon.ico"
                        className="w-16 hover:animate-[spin_3s_linear_infinite]"
                        alt="logo"
                    />
                </Link>
            </div>

            <div className="flex items-center justify-center gap-2 flex-grow">
                <Suspense>
                    <SearchBar />
                </Suspense>
                <AddArtist />
            </div>
            <div className="flex gap-2 items-center">
                <ThemeToggle />
                <Login buttonStyles="" />
            </div>
        </nav>
    )
}

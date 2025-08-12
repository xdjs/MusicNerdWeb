"use client"

import Link from "next/link"
import SearchBar from "./components/SearchBar"
import AddArtist from "./components/AddArtist";
import Login from "@/app/_components/nav/components/Login";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Nav() {
    const { data: session } = useSession();
    const pathname = usePathname();
    if (pathname === "/") return null;

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
                <AddArtist session={session} />
                {session && (
                    <Button variant="ghost" size="sm" asChild>
                        <Link href="/bookmarks" className="flex items-center gap-2">
                            <BookmarkCheck className="h-4 w-4" />
                            <span className="hidden sm:inline">Bookmarks</span>
                        </Link>
                    </Button>
                )}
            </div>
            <div className="flex gap-2">
                <Login buttonStyles="" />
            </div>
        </nav>
    )
}

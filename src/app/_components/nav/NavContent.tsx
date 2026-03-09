"use client"

import Link from "next/link"
import SearchBar from "./components/SearchBar"
import { Suspense } from "react";

export default function NavContent() {
    return (
        <nav className="w-full px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
            {/* Logo / Brand */}
            <Link href="/" className="flex items-center gap-2 group">
                <span className="text-2xl font-bold tracking-tight text-white">
                    RECXRD
                </span>
            </Link>

            {/* Search Bar */}
            <div className="flex-1 max-w-md mx-8">
                <Suspense fallback={
                    <div className="h-10 bg-white/5 rounded-lg animate-pulse" />
                }>
                    <SearchBar />
                </Suspense>
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-4">
                <Link 
                    href="/prototype/dashboard" 
                    className="text-sm text-muted-foreground hover:text-white transition-colors"
                >
                    Artist Demo
                </Link>
            </div>
        </nav>
    )
}

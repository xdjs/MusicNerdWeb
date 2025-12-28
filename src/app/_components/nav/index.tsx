"use client"

import { usePathname } from "next/navigation";
import NavContent from "./NavContent";

export default function Nav() {
    const pathname = usePathname();

    // Don't render nav on home page
    if (pathname === "/") return null;

    return <NavContent />;
}

"use client";

import { AuthenticatedOnly, UnauthenticatedOnly } from "./AuthGuard";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AuthenticatedNav() {
  return (
    <div className="flex items-center gap-4">
      <AuthenticatedOnly>
        <div className="flex items-center gap-2">
          <Link href="/profile">
            <Button variant="ghost" className="text-gray-700 hover:text-gray-900">
              Profile
            </Button>
          </Link>
          <Link href="/leaderboard">
            <Button variant="ghost" className="text-gray-700 hover:text-gray-900">
              Leaderboard
            </Button>
          </Link>
        </div>
      </AuthenticatedOnly>
      
      <UnauthenticatedOnly>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="text-gray-700 hover:text-gray-900">
            About
          </Button>
          <Button variant="ghost" className="text-gray-700 hover:text-gray-900">
            Help
          </Button>
        </div>
      </UnauthenticatedOnly>
    </div>
  );
}

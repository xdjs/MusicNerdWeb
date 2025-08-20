"use client";

import { useAuth } from "./AuthContext";
import { AuthenticatedOnly, UnauthenticatedOnly } from "./AuthGuard";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function AuthenticatedHomeContent() {
  return (
    <>
      <AuthenticatedOnly>
        <div className="space-y-6 text-center">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Welcome back!
            </h2>
            <p className="text-gray-600 text-lg">
              You're logged in and ready to explore music artists.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/profile">
              <Button className="bg-pastypink hover:bg-gray-200 text-white py-3 px-6 rounded-lg transition-colors duration-300">
                View Profile
              </Button>
            </Link>
            <Link href="/leaderboard">
              <Button variant="outline" className="py-3 px-6 rounded-lg transition-colors duration-300">
                Leaderboard
              </Button>
            </Link>
          </div>
        </div>
      </AuthenticatedOnly>
      
      <UnauthenticatedOnly>
        <div className="space-y-6 text-center">
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900">
              Get Started
            </h2>
            <p className="text-gray-600 text-lg">
              Connect your wallet to add artists and manage your collection.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button className="bg-pastypink hover:bg-gray-200 text-white py-3 px-6 rounded-lg transition-colors duration-300">
              Connect Wallet
            </Button>
            <Button variant="outline" className="py-3 px-6 rounded-lg transition-colors duration-300">
              Learn More
            </Button>
          </div>
        </div>
      </UnauthenticatedOnly>
    </>
  );
}

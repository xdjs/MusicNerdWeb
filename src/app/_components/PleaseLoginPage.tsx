"use client";

import Login from "./nav/components/Login";
import { useAuth } from "./AuthContext";

export default function PleaseLoginPage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-4">
          <img
            src="/icon.ico"
            className="w-20 h-20 mx-auto hover:animate-[spin_3s_linear_infinite]"
            alt="Music Nerd Logo"
          />
          <h1 className="text-3xl font-bold text-gray-900">
            Please Log In
          </h1>
          <p className="text-gray-600 text-lg">
            You need to be logged in to view this content.
          </p>
        </div>
        
        <div className="space-y-4">
          <Login buttonStyles="w-full bg-pastypink hover:bg-gray-200 text-white py-3 px-6 rounded-lg transition-colors duration-300" />
          <p className="text-sm text-gray-500">
            Connect your wallet to access all features
          </p>
        </div>
      </div>
    </div>
  );
}
"use client"

import HomePageSplash from "./_components/HomePageSplash";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";

export default function HomePage() {
  const [animation, setAnimation] = useState("static");
  const [authTransitioning, setAuthTransitioning] = useState(false);
  const { status } = useSession();

  // Handle authentication transition
  useEffect(() => {
    if (status === 'loading') {
      setAuthTransitioning(true);
    } else if (status === 'authenticated' && authTransitioning) {
      // Show loading for a bit longer to ensure smooth transition
      const timer = setTimeout(() => {
        window.location.reload();
      }, 500);
      return () => clearTimeout(timer);
    } else if (status === 'unauthenticated') {
      setAuthTransitioning(false);
    }
  }, [status, authTransitioning]);

  if (status === 'loading' || authTransitioning) {
    return (
      <div className="fixed inset-0 bg-white/80 backdrop-blur-sm z-[9999] flex flex-col items-center justify-center gap-4">
        <div className="bg-white p-8 rounded-xl shadow-lg flex flex-col items-center gap-4">
          <img className="h-12" src="/spinner.svg" alt="Loading" />
          <div className="text-xl text-black">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* <div className="absolute bottom-40 left-50  ">
        <Select value={animation} onValueChange={setAnimation}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select Animation" />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectItem value="static">Static</SelectItem>
              <SelectItem value="slide">Slide Text</SelectItem>
              <SelectItem value="typewriter">Typewriter</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
      </div> */}
      <HomePageSplash animation={animation} />
    </>
  );
};


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
  const { status } = useSession();
  const [showLoading, setShowLoading] = useState(false);

  // Use a timeout to prevent brief loading states from showing
  useEffect(() => {
    if (status === 'loading') {
      const timer = setTimeout(() => {
        setShowLoading(true);
      }, 500); // Only show loading after 500ms to prevent brief flashes
      
      return () => clearTimeout(timer);
    } else {
      setShowLoading(false);
    }
  }, [status]);

  // Show loading state while authentication is being determined
  if (showLoading) {
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


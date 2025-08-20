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

  // Trigger page refresh when authentication completes
  useEffect(() => {
    if (status === 'authenticated') {
      // Small delay to ensure session is fully established
      const timer = setTimeout(() => {
        window.location.reload();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [status]);

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


"use client"

import HomePageSplash from "./_components/HomePageSplash";
import AutoRefresh from "./_components/AutoRefresh";
import LoginProviders from "./_components/nav/components/LoginProviders";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useState } from "react";

export default function HomePage() {
  const [animation, setAnimation] = useState("static");
  return (
    <LoginProviders>
      <AutoRefresh />
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
    </LoginProviders>
  );
};


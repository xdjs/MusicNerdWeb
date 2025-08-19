"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "./ThemeProvider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-4 py-2 text-sm rounded-full transition-all duration-200 hover:scale-105 active:scale-95"
      style={{
        backgroundColor: theme === "light" ? "#2ad4fc" : "#ef95ff", // Add Artist Teal for dark mode, NFT Login Pink for light mode
        color: "white"
      }}
    >
      {theme === "light" ? (
        <>
          <Moon className="h-4 w-4" />
          <span>Dark Mode</span>
        </>
      ) : (
        <>
          <Sun className="h-4 w-4" />
          <span>Light Mode</span>
        </>
      )}
    </button>
  )
}

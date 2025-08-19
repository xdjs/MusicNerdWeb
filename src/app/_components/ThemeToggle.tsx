"use client"

import { Moon, Sun } from "lucide-react"
import { useState } from "react"

export function ThemeToggle() {
  const [isDarkMode, setIsDarkMode] = useState(false)

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex items-center gap-2 px-3 py-2 text-sm rounded-full transition-colors"
      style={{
        backgroundColor: isDarkMode ? '#00d4ff' : '#a855f7',
        color: 'white'
      }}
    >
      {isDarkMode ? (
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

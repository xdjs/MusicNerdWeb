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
        backgroundColor: isDarkMode ? '#2ad4fc' : '#a855f7',
        color: 'white'
      }}
    >
      <span>{isDarkMode ? 'Dark Mode' : 'Light Mode'}</span>
      <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
        {isDarkMode ? (
          <Moon className="h-3 w-3 text-gray-800" />
        ) : (
          <Sun className="h-3 w-3 text-gray-800" />
        )}
      </div>
    </button>
  )
}

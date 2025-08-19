"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "./ThemeProvider"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light")
  }

  const isDark = theme === "dark"

  return (
    <button
      onClick={toggleTheme}
      className="relative w-36 h-8 rounded-full transition-all duration-300 ease-in-out flex items-center justify-between px-2"
      style={{
        backgroundColor: isDark ? '#2ad4fc' : '#ef95ff',
      }}
    >
      {/* Text */}
      <span className="text-white text-sm font-medium z-10">
        {isDark ? "Dark Mode" : "Light Mode"}
      </span>
      
      {/* Toggle circle with icon */}
      <div 
        className={`w-6 h-6 rounded-full bg-white flex items-center justify-center transition-all duration-300 ease-in-out ${
          isDark ? 'translate-x-0' : 'translate-x-0'
        }`}
      >
        {isDark ? (
          <Moon size={14} className="text-blue-400" />
        ) : (
          <Sun size={14} className="text-purple-400" />
        )}
      </div>
    </button>
  )
}
